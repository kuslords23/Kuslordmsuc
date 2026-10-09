import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { albums as defaultAlbums, type Album, type Track } from './data/music'
import { fetchRemoteTracks } from './lib/supabase'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import { useAuth } from './context/AuthContext'
import './index.css'

type Tab = 'home' | 'browse' | 'radio' | 'library' | 'search'

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const { user } = useAuth()
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])

  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])
  useEffect(() => { queueRef.current = queue }, [queue])

  // Initial track & session loading
  useEffect(() => {
    fetchRemoteTracks().then((data) => setTracks(data))
  }, [])

  // Audio element setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
    }
    const audio = audioRef.current
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [volume])

  // Define player functions first so they can be used by handleParentMessage
  const playTrack = useCallback((track: Track, trackList: Track[]) => {
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl
      audioRef.current.currentTime = 0
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
    setCurrentTrack(track)
    setQueue(trackList)
    setIsPlaying(true)
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) {
      if (selectedAlbum && selectedAlbum.tracks.length > 0) {
        playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)
      } else if (albums.length > 0 && albums[0].tracks.length > 0) {
        playTrack(albums[0].tracks[0], albums[0].tracks)
      }
      return
    }
    if (audio.paused) { audio.play(); setIsPlaying(true) }
    else { audio.pause(); setIsPlaying(false) }
  }, [currentTrack, selectedAlbum, albums, playTrack])

  const nextTrack = useCallback(() => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length === 0) return
    const index = q.findIndex((t) => t.id === track.id)
    const next = q[(index + 1) % q.length]
    playTrack(next, q)
  }, [playTrack])

  const prevTrack = useCallback(() => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length === 0) return
    const index = q.findIndex((t) => t.id === track.id)
    const prev = q[(index - 1 + q.length) % q.length]
    playTrack(prev, q)
  }, [playTrack])

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }

  const handleVolume = (value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }

  // Dynamic albums list (includes cloud vault for uploaded tracks)
  const albums = useMemo(() => {
    if (tracks.length === 0) return defaultAlbums
    const userUploadedTracks = tracks.filter((t) => 
      t.id.startsWith('uploaded-') || t.id.startsWith('local-') || t.id.length > 20
    )
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

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return []
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    )
  }, [search, tracks])

  // Handle messages from parent (sport-clan-nexus hub)
  const handleParentMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return
    
    const { type, payload } = event.data
    
    switch (type) {
      case 'PLAY_ANTHEM': {
        if (typeof payload?.matchId === 'string') {
          import('./data/sports').then(({ sportsMatches }) => {
            const match = sportsMatches.find(m => m.id === payload.matchId)
            if (match && match.anthemTrackId) {
              // We need to find the track from state - use a ref to access latest tracks
              // This is handled via a separate effect below
            }
          })
        }
        break
      }
      case 'TOGGLE_PLAY':
        togglePlay()
        break
      case 'NEXT_TRACK':
        nextTrack()
        break
      case 'PREV_TRACK':
        prevTrack()
        break
      case 'SET_VOLUME':
        if (typeof payload?.volume === 'number' && payload.volume >= 0 && payload.volume <= 1) {
          handleVolume(payload.volume)
        }
        break
      case 'SEEK':
        if (typeof payload?.time === 'number') {
          handleSeek(payload.time)
        }
        break
      case 'GET_STATE':
        event.source?.postMessage(
          { 
            type: 'PLAYBACK_STATE', 
            payload: {
              isPlaying,
              currentTrackId: currentTrack?.id,
              currentTime,
              duration,
              volume,
              queue: queue.map(t => t.id)
            }
          },
          event.origin
        )
        break
      case 'SET_QUEUE':
        if (Array.isArray(payload?.trackIds)) {
          // This is handled via a separate effect below
        }
        break
    }
  }, [tracks, playTrack, togglePlay, nextTrack, prevTrack, handleVolume, handleSeek])

  // Detect embedded mode (inside sport-clan-nexus iframe)
  useEffect(() => {
    const checkEmbedded = () => {
      try {
        const embedded = window.parent !== window
        setIsEmbedded(embedded)
        if (embedded) {
          window.parent.postMessage(
            { type: 'MUSIC_APP_READY', payload: { version: '1.0.0' } },
            '*'
          )
        }
      } catch (e) {
        setIsEmbedded(false)
      }
    }
    checkEmbedded()
    window.addEventListener('message', handleParentMessage)
    return () => window.removeEventListener('message', handleParentMessage)
  }, [handleParentMessage])

  // Broadcast state updates to parent when embedded
  useEffect(() => {
    if (!isEmbedded) return
    
    let lastState = ''
    const broadcastState = () => {
      const state = JSON.stringify({
        isPlaying,
        currentTrackId: currentTrack?.id,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        volume,
      })
      if (state !== lastState) {
        lastState = state
        window.parent?.postMessage(
          { type: 'PLAYBACK_STATE_UPDATE', payload: JSON.parse(state) },
          '*'
        )
      }
    }
    
    const interval = setInterval(broadcastState, 1000)
    return () => clearInterval(interval)
  }, [isEmbedded, isPlaying, currentTrack?.id, currentTime, duration, volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => {
      const track = currentTrackRef.current
      const q = queueRef.current
      if (!track || q.length === 0) return
      const index = q.findIndex((t) => t.id === track.id)
      const next = q[(index + 1) % q.length]
      playTrack(next, q)
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [playTrack])

  const handleSignOut = async () => {
    setAuthModalOpen(false)
    setUploadModalOpen(false)
  }

  const handleTrackUploaded = useCallback((newTrack: Track) => {
    setTracks((prev) => [newTrack, ...prev])
    playTrack(newTrack, [newTrack])
  }, [playTrack])

  // --- Tab Content Renderers ---

  const renderHome = () => (
    <div className="tab-scroll">
      <div className="mobile-hero">
        <span className="hero-tag">👑 KUS-LORDS ROYAL SOUND</span>
        <h1>Discover the feeling of infinite sound.</h1>
        <p>Stream high-fidelity tracks, access your Supabase bucket vault, and curate playlists.</p>
        <div className="hero-actions">
          <button className="hero-play" onClick={() => {
            const t = albums[0]
            if (t?.tracks.length) playTrack(t.tracks[0], t.tracks)
          }}>▶ Listen Now</button>
          <button className="hero-upload" onClick={() => setUploadModalOpen(true)}>☁ Upload</button>
        </div>
      </div>
      <section>
        <div className="section-title"><h2>Featured Royal Albums</h2></div>
        <div className="album-grid">
          {albums.slice(0, 4).map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
      <section>
        <div className="section-title"><h2>Made For You</h2></div>
        <div className="album-grid">
          {albums.slice(4).map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )

  const renderBrowse = () => (
    <div className="tab-scroll">
      <div className="section-title"><h2>Browse & New Releases</h2></div>
      <div className="genre-strip">
        {['Synthwave', 'Afrobeats', 'Ambient', 'Stadium', 'Lo-Fi', 'Deep House'].map((g) => (
          <button key={g} className="genre-chip" onClick={() => setSearch(g)}>{g}</button>
        ))}
      </div>
      <section>
        <div className="section-title"><h2>New Albums</h2></div>
        <div className="album-grid">
          {albums.map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )

  const renderRadio = () => (
    <div className="tab-scroll">
      <div className="section-title"><h2>🎙 Radio & Live Stations</h2></div>
      <div className="radio-stations">
        {[
          { name: 'Focus Flow', genre: 'Ambient / Lo-Fi', color: '#00c9ff, #7b2fff', icon: '🎯' },
          { name: 'Motivation Mix', genre: 'High Energy', color: '#f857a6, #614ad2', icon: '🔥' },
          { name: 'Oldies Gold', genre: 'Classic Hits', color: '#f5af19, #e65c00', icon: '🎶' },
          { name: 'Reggae Vibe', genre: 'Island Rhythms', color: '#11998e, #38ef7d', icon: '🌴' },
          { name: 'Metal Mayhem', genre: 'Heavy Rock', color: '#e6c656, #3b2800', icon: '⚡' },
          { name: 'Afro Grooves', genre: 'Afrobeats', color: '#ff6b6b, #c5a059', icon: '🌍' },
        ].map((s) => (
          <div key={s.name} className="radio-card" onClick={() => {
            const t = tracks.find(t => t.genre?.toLowerCase().includes(s.genre.split(' ')[0].toLowerCase())) || tracks[0]
            playTrack(t, tracks)
          }}>
            <div className="radio-art" style={{ background: `linear-gradient(135deg, ${s.color})` }}>
              <span className="radio-icon">{s.icon}</span>
              <span className="live-dot">●</span>
            </div>
            <strong>{s.name}</strong>
            <span>{s.genre}</span>
          </div>
        ))}
      </div>
      <section>
        <div className="section-title"><h2>Stadium Anthems</h2></div>
        <div className="track-list-compact">
          {tracks.filter(t => t.isSportsAnthem).map((t) => (
            <div key={t.id} className="track-row-compact" onClick={() => playTrack(t, tracks)}>
              <div className="mini-cover" style={{ background: t.cover }} />
              <div className="track-meta"><strong>{t.title}</strong><span>{t.artist}</span></div>
              <span className="stadium-badge">STADIUM</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const renderLibrary = () => (
    <div className="tab-scroll">
      <div className="section-title"><h2>📚 Your Library</h2></div>
      <div className="lib-segments">
        {['Playlists', 'Artists', 'Albums', 'Songs', 'Downloaded'].map((seg) => (
          <button key={seg} className="lib-seg-btn">{seg}</button>
        ))}
      </div>
      <section>
        <div className="section-title"><h2>Recently Added</h2></div>
        <div className="album-grid">
          {albums.slice(0, 4).map((a) => (
            <AlbumCard
              key={a.id}
              album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
      <section>
        <div className="section-title"><h2>Top Tracks</h2></div>
        <div className="track-list-compact">
          {[...tracks].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 8).map((t) => (
            <div key={t.id} className="track-row-compact" onClick={() => playTrack(t, tracks)}>
              <div className="mini-cover" style={{ background: t.cover }} />
              <div className="track-meta"><strong>{t.title}</strong><span>{t.artist}</span></div>
              <span className="like-count">❤️ {t.likes}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const renderSearch = () => (
    <div className="tab-scroll">
      <div className="search-input-wrap">
        <span className="search-icon">⌕</span>
        <input
          className="search-input-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Songs, artists, albums..."
          autoFocus
        />
        {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
      </div>
      {search.trim() ? (
        <>
          <div className="section-title"><h2>Albums</h2></div>
          <div className="album-grid">
            {filteredAlbums.map((a) => (
              <AlbumCard
                key={a.id}
                album={a}
                onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
                onSelect={() => setSelectedAlbumId(a.id)}
              />
            ))}
          </div>
          <div className="section-title"><h2>Tracks</h2></div>
          <div className="track-list-compact">
            {filteredTracks.map((t) => (
              <div key={t.id} className="track-row-compact" onClick={() => playTrack(t, tracks)}>
                <div className="mini-cover" style={{ background: t.cover }} />
                <div className="track-meta"><strong>{t.title}</strong><span>{t.artist}</span></div>
                <span className="like-count">❤️ {t.likes || 0}</span>
              </div>
            ))}
          </div>
          {filteredTracks.length === 0 && <div className="empty">No results for "{search}".</div>}
        </>
      ) : (
        <div className="search-empty">
          <span>Search for your favorite tracks, artists, or albums</span>
        </div>
      )}
    </div>
  )

  const renderFullPlayer = () => {
    if (!currentTrack) return null
    return (
      <div className="full-player-overlay">
        <div className="full-player">
          <div className="full-player-bg" style={{ background: currentTrack.cover || 'linear-gradient(135deg, #fa2d6c, #fc6f60)' }} />
          <div className="full-player-content">
            <div className="full-player-top">
              <button className="collapse-btn" onClick={() => setMiniPlayerOpen(false)}>▼</button>
              <span className="now-playing-label">NOW PLAYING</span>
              <button className="queue-btn" onClick={() => setMiniPlayerOpen(false)}>☰</button>
            </div>
            <div
              className="full-artwork"
              style={{ background: currentTrack.cover || 'linear-gradient(135deg, #fa2d6c, #fc6f60)' }}
            >
              <div className="vinyl-shine" />
            </div>
            <div className="full-track-info">
              <h2>{currentTrack.title || 'No Track Selected'}</h2>
              <p>{currentTrack.artist || 'Harmony Kus-lords'}</p>
              {currentTrack.isSportsAnthem && <span className="stadium-badge">⚡ STADIUM ANTHEM</span>}
            </div>
            <div className="full-progress">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="full-range"
              />
              <div className="time-row">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <div className="full-controls">
              <button className="ctrl-sm" onClick={prevTrack}>⏮</button>
              <button className="ctrl-lg" onClick={togglePlay}>
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button className="ctrl-sm" onClick={nextTrack}>⏭</button>
            </div>
            <div className="volume-row">
              <span>🔊</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => handleVolume(Number(e.target.value))}
                className="vol-range"
              />
            </div>
            <div className="audio-source">
              <span>Audio Output: Device Speakers</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-mobile">
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        <Sidebar
          search={search}
          setSearch={setSearch}
          onNavigateHome={() => {
            setSelectedAlbumId(null)
            setSearch('')
            setActiveTab('home')
          }}
          onSelectAlbum={setSelectedAlbumId}
          activeAlbumId={selectedAlbumId}
          albums={albums}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          onSignOut={handleSignOut}
          collapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div className="main-mobile">
        <div className="mobile-content">
          {selectedAlbum ? (
            <div className="mobile-album-view">
              <button className="back-btn" onClick={() => setSelectedAlbumId(null)}>
                ← Back
              </button>
              <PlaylistView
                album={selectedAlbum}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={playTrack}
                onTogglePlay={togglePlay}
              />
            </div>
          ) : (
            <>
              {activeTab === 'home' && renderHome()}
              {activeTab === 'browse' && renderBrowse()}
              {activeTab === 'radio' && renderRadio()}
              {activeTab === 'library' && renderLibrary()}
              {activeTab === 'search' && renderSearch()}
            </>
          )}
        </div>
      </div>

      {/* Mini Player (Mobile) */}
      {currentTrack && (
        <div className="mini-player" onClick={() => setMiniPlayerOpen(true)}>
          <div className="mini-cover" style={{ background: currentTrack.cover }} />
          <div className="mini-info">
            <strong>{currentTrack.title}</strong>
            <span>{currentTrack.artist}</span>
          </div>
          <button className="mini-ctrl" onClick={(e) => { e.stopPropagation(); togglePlay() }}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button className="mini-ctrl" onClick={(e) => { e.stopPropagation(); nextTrack() }}>
            ⏭
          </button>
        </div>
      )}

      {/* Full Screen Player */}
      {miniPlayerOpen && renderFullPlayer()}

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav">
        {(['home', 'browse', 'radio', 'library', 'search'] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab); setSelectedAlbumId(null); }}
          >
            <span className="nav-icon">
              {tab === 'home' ? '🏠' : tab === 'browse' ? '🆕' : tab === 'radio' ? '📻' : tab === 'library' ? '📚' : '⌕'}
            </span>
            <span className="nav-label">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
          </button>
        ))}
      </nav>

      {/* Desktop Player */}
      <div className="desktop-player">
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

      {/* Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        user={user}
        onTrackUploaded={handleTrackUploaded}
        onOpenAuth={() => setAuthModalOpen(true)}
      />
    </div>
  )
}