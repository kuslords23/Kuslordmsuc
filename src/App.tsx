import { useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { albums as defaultAlbums, type Album, type Track } from './data/music'
import { supabase, fetchRemoteTracks } from './lib/supabase'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import './index.css'

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // 1. Initial track & session loading
  useEffect(() => {
    // Load tracks from Supabase or Fallback
    fetchRemoteTracks().then((data) => {
      setTracks(data)
    })

    // Supabase auth subscription
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Dynamic albums list
  const albums = useMemo(() => {
    if (tracks.length === 0) return defaultAlbums

    const userUploadedTracks = tracks.filter((t) => t.id.startsWith('local-') || t.id.length > 20)
    if (userUploadedTracks.length > 0) {
      const cloudAlbum: Album = {
        id: 'cloud-vault',
        title: 'Kus-lords Cloud Vault',
        artist: user?.user_metadata?.username || 'Community',
        description: 'Uploaded directly to Kus-lords Supabase Bucket storage.',
        cover: 'linear-gradient(135deg, #ffd700, #ff8c00)',
        category: 'royals',
        tracks: userUploadedTracks,
      }
      return [cloudAlbum, ...defaultAlbums]
    }
    return defaultAlbums
  }, [tracks, user])

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [selectedAlbumId, albums],
  )

  const filteredAlbums = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return albums
    return albums.filter((album) =>
      `${album.title} ${album.artist} ${album.tracks.map((t) => t.title).join(' ')}`
        .toLowerCase()
        .includes(q),
    )
  }, [search, albums])

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
    }
    const audio = audioRef.current

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      const track = currentTrackRef.current
      const q = queueRef.current
      if (!track || q.length === 0) return
      const index = q.findIndex((t) => t.id === track.id)
      const next = q[(index + 1) % q.length]
      playTrack(next, q)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  function playTrack(track: Track, trackList: Track[]) {
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
    setCurrentTrack(track)
    setQueue(trackList)
    setIsPlaying(true)
  }

  const nextTrack = () => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length === 0) return
    const index = q.findIndex((t) => t.id === track.id)
    const next = q[(index + 1) % q.length]
    playTrack(next, q)
  }

  const prevTrack = () => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length === 0) return
    const index = q.findIndex((t) => t.id === track.id)
    const prev = q[(index - 1 + q.length) % q.length]
    playTrack(prev, q)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) {
      if (selectedAlbum && selectedAlbum.tracks.length > 0) {
        playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)
      } else if (albums.length > 0 && albums[0].tracks.length > 0) {
        playTrack(albums[0].tracks[0], albums[0].tracks)
      }
      return
    }
    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolume = (value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleTrackUploaded = (newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev])
    playTrack(newTrack, [newTrack, ...tracks])
  }

  const renderHome = () => (
    <div className="main-scroll">
      <div className="hero">
        <div className="hero-text">
          <span>KUS-LORDS ROYAL SOUND</span>
          <h1>Discover the feeling <br />of infinite sound.</h1>
          <p>Stream high-fidelity tracks, access your Supabase bucket vault, and curate playlists.</p>
        </div>
        <div className="hero-actions">
          <button
            className="hero-play"
            onClick={() => {
              const targetAlbum = albums[0]
              if (targetAlbum && targetAlbum.tracks.length > 0) {
                playTrack(targetAlbum.tracks[0], targetAlbum.tracks)
              }
            }}
          >
            ▶ Listen Now
          </button>
          <button className="hero-upload" onClick={() => setUploadModalOpen(true)}>
            ☁ Upload Track
          </button>
        </div>
      </div>

      <section>
        <div className="section-title">
          <h2>Featured Royal Albums</h2>
          <button onClick={() => setSelectedAlbumId(null)}>See All</button>
        </div>
        <div className="album-grid">
          {albums.slice(0, 4).map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onPlay={(a) => {
                setSelectedAlbumId(a.id)
                if (a.tracks.length > 0) playTrack(a.tracks[0], a.tracks)
              }}
              onSelect={(a) => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Made For You</h2>
          <button>See All</button>
        </div>
        <div className="album-grid">
          {albums.slice(4).map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onPlay={(a) => {
                setSelectedAlbumId(a.id)
                if (a.tracks.length > 0) playTrack(a.tracks[0], a.tracks)
              }}
              onSelect={(a) => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )

  const renderSearchResults = () => (
    <div className="main-scroll">
      <section>
        <div className="section-title">
          <h2>Search Results</h2>
        </div>
        {filteredAlbums.length ? (
          <div className="album-grid">
            {filteredAlbums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                onPlay={(a) => {
                  setSelectedAlbumId(a.id)
                  if (a.tracks.length > 0) playTrack(a.tracks[0], a.tracks)
                }}
                onSelect={(a) => setSelectedAlbumId(a.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty">No albums match “{search}”.</div>
        )}
      </section>
      <section>
        <div className="section-title"><h2>All Tracks</h2></div>
        <div className="track-table">
          {tracks
            .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.artist.toLowerCase().includes(search.toLowerCase()))
            .map((track, index) => (
              <div key={track.id} className="track-row" onClick={() => playTrack(track, tracks)}>
                <span className="col-idx">{index + 1}</span>
                <span className="col-title">
                  <span className="mini-cover" style={{ background: track.cover }} />
                  {track.title}
                </span>
                <span className="col-artist">{track.artist}</span>
                <span className="col-time">—</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  )

  return (
    <div className="app">
      <Sidebar
        search={search}
        setSearch={setSearch}
        onNavigateHome={() => {
          setSelectedAlbumId(null)
          setSearch('')
        }}
        onSelectAlbum={(id) => setSelectedAlbumId(id)}
        activeAlbumId={selectedAlbumId}
        albums={albums}
        user={user}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenUpload={() => setUploadModalOpen(true)}
        onSignOut={handleSignOut}
      />

      <main className="main-area">
        {search.trim() ? (
          renderSearchResults()
        ) : selectedAlbum ? (
          <div className="main-scroll">
            <button className="back-button" onClick={() => setSelectedAlbumId(null)}>← Back to Home</button>
            <PlaylistView
              album={selectedAlbum}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={playTrack}
              onTogglePlay={togglePlay}
            />
          </div>
        ) : (
          renderHome()
        )}
      </main>

      <PlayerBar
        title={currentTrack?.title}
        artist={currentTrack?.artist}
        cover={currentTrack?.cover}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlay={togglePlay}
        onNext={nextTrack}
        onPrev={prevTrack}
        onSeek={handleSeek}
        onVolume={handleVolume}
      />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        user={user}
        onTrackUploaded={handleTrackUploaded}
        onOpenAuth={() => {
          setUploadModalOpen(false)
          setAuthModalOpen(true)
        }}
      />
    </div>
  )
}