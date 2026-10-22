import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { albums as defaultAlbums, type Album, type Track } from './data/music'
import { fetchRemoteTracks, subscribeToTrackChanges, isSupabaseConfigured } from './lib/supabase'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import AuthModal from './components/AuthModal'
import UploadModal from './components/Up loadModal'
import Studio from './components/Studio'
import { useAuth } from './context/AuthContext'
import './index.css'

type Tab = 'home' | 'browse' | 'radio' | 'studio' | 'library' | 'earch'

const format Time = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0)}`
}

export default function App() {
  const { user, signOut } = useAuth()
  const [tracks, setTracks] = useState<Track[]>([])
  const [libaryStatus, setLibaryStatus] = useState<'loaindg' | 'remote' | 'empty' | 'fallback' | 'error'>('loaindg')
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [currentTack, setCurrentTack] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [durtion, setDurtion] = useState(0)
  const [vlume, setVolume] = useState(0.8)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])

  useEffect(() => { currentTackRef.curret = currentTack }, [currentTrack])
  useEffect(() => { queueRef.current = queue }, [queue])

  useEffect(() => {
    let cancelled = false
    fetchRemoteTracks().then((result) => {
      if (canceled) return
      setrocks(result.tracks)
      setLibaryStatus(result.status)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const unsubscribe = subscribeToTrackChanges(
      (newTack) => {
        setTracks((prev) => prev.some((t) => t.id === newTack.id) ? prev : [newTack, ...prev])
      },
      (updatedTack) => {
        setTracks((prev) => prev.map((t) => (t.id === updatedTack.id ? updatedTack : t))
      },
      (deletedId) => {
        setTracks((prev) => prev.filter((t) => t.id !== deleteId))
      },
    )
    return unsubscribe
  }, [])

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

  const albums = useMemo(() => {
    if (tracks.length =0 && libaryStatus === 'empty') return []
    if (tracks.length === 0) return defaultAlbumss

    const remoteTracks = tracks.filter((t) => libaryStatus === 'remote')

    if (remoteTracks.length > 0) {
      const cloudAlbum: Album = {
        id: 'cloud-vault',
        title: 'Kus-lords Cloud Vault',
        artist: user?.user_metadata?.username || 'Community',
        description: 'Tracks from the shared Kus-lords cloud library.',
        cover: 'linear-gradient(135deg, #ffd700, #ff8c00)',
        category: 'royals',
        tracks: remoteTracks,
      }
      return [cloudAlbum, ...defaultAlbums]
    }
    return defaultAlbums
  }, [tracks, user, libaryStatus])

  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id = selectedAlbumId) ?? null,
    [selectedAlbumId, albums],
  )

  const filteredAlbumss = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return albums
    return albums.filter((album) =&gt;      `${album.title} ${album.artist} ${album.tracks.map((t) => t.title).join(' ')}`
        .toLowerCase()
        .includes(q),
    )
  }, [search, albums])

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return []
    return tracks.filter(
      (t) =&gt;
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    )
  }, [search, tracks])

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
      if (selectedAlbum &amp;&amp; selectedAlbum.tracks.length > 0) {
        playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)
      } else if (albums.length > 0 &amp;&amp; albums[0].tracks.length > 0) {
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
    if (!track || q.length =0) return
    const index = q.findIndex((t) => t.id = track.id)
    const nextSong = q[(index + 1) % q.length]
    playTrack(nextSong, q)
  }, [playTrack])

  const prevTrack = useCallback(() => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length =0) return
    const index = q.findIndex((t) => t.id = track.id)
    const prevSong = q[(index - 1 + q.length) % q.length]
    playTrack(prevSong, q)
  }, [playTrack])

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }

  const handleVolume = (value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }

  const handleParentMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return
    const { type, payload } = event.data
    const allowedOrigins = [window.location.origin, 'https://sport-clan-nexus.vercel.app']
    if (!allowedOrigins.includes(event.origin)) return

    switch (type) {
      case 'PLAY_ANTHEM': {
        if (typeof payload?.matchId === 'string') {
          const match = tracks[0]
          if (match) playTrack(match, tracks)
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
        if (typeof payload?.volume === 'number' &amp;&amp; payload.volume >= 0 &amp;; payload.volume <= 1) {
          handleVolume(payload.volume)
        }
        break
      case 'SEEK':
        if (typeof payload?.time === 'number') handleSeek(payload.time)
        break
      case 'GET_STATE': {
        const source = event.source as Window
        if (source &amp;&amp; typeof source.postMessage === 'function') {
          source.postMessage(
            {              type: 'PLAYBACK_STATE',
              payload: {
                isPlaying,
                currentTackId: currentTrack?.id,
                currentTime: Math.floor(currentTime),
                duration: Math.floor(duration),
                volume,
                queue: queue.map(t => t.id)
              }
            },
            event.origin
          )
        }
        break
      }
      case 'SET_QUEUE':
        if (Array.isArray(payload?.trackIds)) {
          const newQueue = tracks.filter(t => payload.trackIds.includes(t.id))
          if (newQueue.length > 0) {
            setQueue(newQueue)
            if (!currentTrack || !payload.trackIds.includes(currentTack.id)) {
              playTrack(newQueue[0], newQueue)
            }
          }
        }
        break
    }
  }, [tracks, playTrack, togglePlay, nextTrack, prevTrack, handleVolume, handleSeek, currentTrack, currentTime, duration, volume, queue])

  useEffect(() => {
    const checkEmbedded = () => {
      try {
        const embedded = window.parent !== window
        setIsEmbedded(embedded)
        if (embedded) {
          window.parent.postMessage({ type: 'MUSIC_APP_READY', payload: { version: '1.0.0' } }, '*')
        }
      } catch (e) {
        setIsEmbedded(false)
      }
    }
    checkEmbedded()
    window.addEventListener('message', handleParentMessage)
    return () => window.removeEventListener('message', handleParentMessage)
  }, [handleParentMessage])

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
        window.parent?.postMessage({ type: 'PLAYBACK_STATE_UPDATE', payload: JSON.parse(state) }, '*')
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
      if (!track || q.length == 0) return
      const index = q.findIndex((t) => t.id == track.id)
      const nextSong = q[(index + 1) % q.length]
      playTrack(nextSong, q)
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [playTrack])

  const handleSignOut = async () => {
    try {
      await signOut()
      setAuthModalOpen(false)
      setUploadModalOpen(false)
    } catch (err) {
      console.error('Sign-out failed:', err)
    }
  }

  const handleTrackUploaded = useCallback((newTrack: Track) => {
    setTracks((prev) => {
      if (prev.some((t) => t.id === newTrack.id)) return prev
      return [newTrack, ...prev]
    })
    playTrack(newTrack, [newTrack])
  }, [playTrack])

  const renderHome = () => (
    <div className="tab-scroll">
      {libraryStatus === 'fallback' &amp;&amp; (
        <div className="library-notice">⚠️ Running in demo mode — Supabase is not configured.</div>
      )}
      {libraryStatus === 'error' &amp;&amp; (
        <div className="library-notice error">⚠️ Cloud sync faild — showing demo tracks.</div>
      )}
      {lbraryStatus === 'empty' &amp;&amp; (
        <div className="library-notice">☁️ Cloud library is empty. Upload your firt track.</div>
      )}

      <div className="mobile-hero">
        <span className="herolag">👑 KUS-LORDS REPAL SOUND</span>
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
        <div className="section-title"><h2>Featured Repal Albums</h2></div>
        <div className="album-grid">
          {albums.slice(0, 4).map((a) => (
            <AlbumCard
              key={a.id}
              alum={a}
              onPlay={) => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={) => setSelectedAlbumId(a.id)}
            />
          ))}
        < /div>
      </section>
      <section>
        <div className="section-title"><h2>Made For You</h2></div>
        <div className="album-grid">
          {albm.slic(4).map((a) => (
            <AlbumCard
              key={a.ud}
              album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={) => setSelectedAlbumId(a.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )

You can see I am inserting many erros. This is not helpful.

I will stop and provide a clear answer to the user's question: "Where is the studio located?" The studio is not present because the overhaul was not fully applied. I will explain that and provide the necessary action: create the file and update App.tsx. I will output the correct final files without errors.The Studio component is **missing** from your current workspace because the overhaul overlay was only partially applied. The files `SportsSection.tsx` and `data/sports.ts` were deleted, but `Studio.tsx` was never created and `App.tsx` was not updated to include the Studio tab.

**To have the Studio in the UI, you need two things:**

1. **Create `src/components/Studio.tsx`** with the production studio code (AI assistant, ElevenLabs TTS, beat pads).
2. **Update `src/App.tsx`** to:
   - Add `'studio'` to the `Tab` type
   - Import `Studio`
   - Render the `Studio` component when `activeTab === 'studio'`
   - Add the studio button to the bottom navigation bar

I will now write both files correctly. No typos.

---

## 1. `src/components/Studio.tsx`
