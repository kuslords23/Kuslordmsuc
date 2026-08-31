import { useEffect, useMemo, useRef, useState } from 'react'
import { albums, allTracks, Track } from './data/music'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import './index.css'

export default function App() {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? null,
    [selectedAlbumId],
  )

  const filteredAlbums = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return albums
    return albums.filter((album) =>
      `${album.title} ${album.artist} ${album.tracks.map((t) => t.title).join(' ')}`
        .toLowerCase()
        .includes(q),
    )
  }, [search])

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

  const playTrack = (track: Track, tracks: Track[]) => {
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    }
    setCurrentTrack(track)
    setQueue(tracks)
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
      if (selectedAlbum) {
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

  const selectAlbum = (id: string) => setSelectedAlbumId(id)

  const handleHeroPlay = () => {
    const targetAlbum = selectedAlbum || albums[0]
    if (targetAlbum && targetAlbum.tracks.length > 0) {
      playTrack(targetAlbum.tracks[0], targetAlbum.tracks)
    }
  }

  const renderHome = () => (
    <div className="main-scroll">
      <div className="hero">
        <div className="hero-text">
          <span>LISTEN WITHOUT BOUNDARIES</span>
          <h1>Discover the feeling <br />of infinite sound.</h1>
          <p>Your favorite albums, playlists, and handcrafted moods — one tap away.</p>
        </div>
        <button className="hero-play" onClick={handleHeroPlay}>Listen Now</button>
      </div>

      <section>
        <div className="section-title">
          <h2>Recently Played</h2>
          <button onClick={() => setSelectedAlbumId(null)}>See All</button>
        </div>
        <div className="album-grid">
          {albums.slice(0, 4).map((album) => (
            <AlbumCard key={album.id} album={album} onPlay={(a) => playTrack(a.tracks[0], a.tracks)} />
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
            <AlbumCard key={album.id} album={album} onPlay={(a) => playTrack(a.tracks[0], a.tracks)} />
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
              <AlbumCard key={album.id} album={album} onPlay={(a) => playTrack(a.tracks[0], a.tracks)} />
            ))}
          </div>
        ) : (
          <div className="empty">No albums match “{search}”.</div>
        )}
      </section>
      <section>
        <div className="section-title"><h2>All Tracks</h2></div>
        <div className="track-table">
          {allTracks
            .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
            .map((track, index) => (
              <div key={track.id} className="track-row" onClick={() => playTrack(track, allTracks)}>
                <span className="col-idx">{index + 1}</span>
                <span className="col-title"><span className="mini-cover" style={{ background: track.cover }} />{track.title}</span>
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
        onSelectAlbum={selectAlbum}
        activeAlbumId={selectedAlbumId}
      />
      <main className="main-area">
        {search.trim()
          ? renderSearchResults()
          : selectedAlbum
            ? (
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
            )
            : renderHome()
        }
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
    </div>
  )
}