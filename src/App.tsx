import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { albums as defaultAlbums, initialTracks, type Album, type Track } from './data/music'
import { sportsMatches } from './data/sports'
import { fetchPublicArtistProfiles, fetchRemoteTracks, saveArtistProfile, supabase, type MusicArtistProfileInput, type PublicMusicArtistProfile } from './lib/supabase'
import { loadExtractedTracks } from './lib/integrateExtracted'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import Studio from './components/Studio'
import ArtistDirectory from './components/ArtistDirectory'
import CommentsPanel from './components/CommentsPanel'
import PlaylistLibrary from './components/PlaylistLibrary'
import { loadPlaylistsLocal, savePlaylistsLocal, type MusicPlaylist } from './lib/playlists'
import { loadFollowedArtists, saveFollowedArtists } from './lib/artistFollows'
import { musicEmbedHeight, parseMusicLink } from './lib/musicEmbeds'
import { useAuth } from './context/AuthContext'
import './index.css'

type Tab = 'home' | 'browse' | 'radio' | 'library' | 'search' | 'studio' | 'artists'

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const { user, signOut } = useAuth()

  // Start with the built-in tracks so the screen is never empty
  // while we wait for the cloud library to load.
  const [tracks, setTracks] = useState<Track[]>(() => [
    ...loadExtractedTracks(),
    ...initialTracks,
  ])
  const [artistProfiles, setArtistProfiles] = useState<PublicMusicArtistProfile[]>([])
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>(() => loadPlaylistsLocal())
  const [commentsTrack, setCommentsTrack] = useState<Track | null>(null)
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(() => loadFollowedArtists())

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

  // Load cloud tracks; never let a failure blank the screen
  useEffect(() => {
    let cancelled = false
    fetchRemoteTracks()
      .then((data) => {
        if (cancelled) return
        const remote = Array.isArray(data?.tracks) ? data.tracks : []
        const merged = [...loadExtractedTracks(), ...remote]
        if (merged.length > 0) setTracks(merged)
      })
      .catch((err) => {
        console.error('Could not load cloud library:', err)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    savePlaylistsLocal(playlists)
  }, [playlists])

  useEffect(() => {
    saveFollowedArtists(followedArtists)
  }, [followedArtists])

  // Public SCN artist profiles and storefront metadata.
  useEffect(() => {
    let cancelled = false
    fetchPublicArtistProfiles().then((profiles) => {
      if (!cancelled) setArtistProfiles(profiles)
    })
    return () => { cancelled = true }
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

  const studioTracks = useMemo(
    () => (tracks.length > 0 ? tracks : initialTracks),
    [tracks],
  )

  // Player functions
  const playTrack = useCallback((track: Track | undefined, trackList: Track[]) => {
    if (!track) return
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
    playTrack(q[(index + 1) % q.length], q)
  }, [playTrack])

  const prevTrack = useCallback(() => {
    const track = currentTrackRef.current
    const q = queueRef.current
    if (!track || q.length === 0) return
    const index = q.findIndex((t) => t.id === track.id)
    playTrack(q[(index - 1 + q.length) % q.length], q)
  }, [playTrack])

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }

  const handleVolume = (value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }

  // Cross-companion control bridge. Commands are accepted only from the
  // embedding parent and from explicitly configured origins.
  const allowedParentOrigins = useMemo(() => {
    const configured = (import.meta.env.VITE_ALLOWED_PARENT_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    return new Set([
      window.location.origin,
      'https://sport-clan-nexus.vercel.app',
      ...configured,
    ])
  }, [])

  const parentOrigin = useMemo(() => {
    try {
      return document.referrer ? new URL(document.referrer).origin : ''
    } catch {
      return ''
    }
  }, [])

  const sendParentMessage = useCallback((type: string, payload: Record<string, unknown>) => {
    if (window.parent === window || !parentOrigin || !allowedParentOrigins.has(parentOrigin)) return
    window.parent.postMessage({ type, payload }, parentOrigin)
  }, [allowedParentOrigins, parentOrigin])

  const handleParentMessage = useCallback(async (event: MessageEvent) => {
    if (event.source !== window.parent || !event.data || typeof event.data !== 'object') return
    if (!allowedParentOrigins.has(event.origin)) return

    const { type, payload } = event.data as { type?: string; payload?: Record<string, unknown> }
    const reply = (replyType: string, data: Record<string, unknown>) => {
      const source = event.source as Window | null
      source?.postMessage({ type: replyType, payload: data }, event.origin)
    }
    const trackSummary = (track: Track) => ({
      id: track.id,
      postId: track.postId || track.id,
      liked: Boolean(track.liked),
      likes: track.likes || 0,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      cover: track.cover,
      genre: track.genre || null,
      audioUrl: track.audioUrl,
    })

    switch (type) {
      case 'PLAY_ANTHEM': {
        if (typeof payload?.matchId === 'string') {
          const match = sportsMatches.find((m) => m.id === payload.matchId)
          const track = match?.anthemTrackId
            ? tracks.find((t) => t.id === match.anthemTrackId) || tracks[0]
            : undefined
          if (track) playTrack(track, tracks)
        }
        break
      }
      case 'LIKE_TRACK': {
        const requestedId = typeof payload?.trackId === 'string' ? payload.trackId : currentTrack?.id || ''
        const target = tracks.find((item) => item.id === requestedId || item.postId === requestedId)
        if (!target) {
          reply('MUSIC_ACTION_RESULT', { action: type, ok: false, error: 'Track not found in loaded library' })
          break
        }
        const nextLiked = !target.liked
        const nextLikes = Math.max(0, (target.likes || 0) + (nextLiked ? 1 : -1))
        const updateTrack = (item: Track): Track => item.id === target.id ? { ...item, liked: nextLiked, likes: nextLikes } : item
        setTracks((previous) => previous.map(updateTrack))
        setQueue((previous) => previous.map(updateTrack))
        setCurrentTrack((previous) => previous?.id === target.id ? updateTrack(previous) : previous)
        reply('MUSIC_ACTION_RESULT', { action: type, ok: true, trackId: target.id, liked: nextLiked, likes: nextLikes, persistence: 'local-session' })
        break
      }
      case 'PLAY_TRACK': {
        const trackId = typeof payload?.trackId === 'string' ? payload.trackId : ''
        const track = tracks.find((item) => item.id === trackId || item.postId === trackId)
        if (track) {
          playTrack(track, queue.length ? queue : tracks)
          reply('MUSIC_ACTION_RESULT', { action: type, ok: true, trackId: track.id })
        } else {
          reply('MUSIC_ACTION_RESULT', { action: type, ok: false, error: 'Track not found in loaded library' })
        }
        break
      }
      case 'SEARCH_TRACKS': {
        const query = typeof payload?.query === 'string' ? payload.query.trim().toLowerCase() : ''
        const limit = Math.min(50, Math.max(1, Number(payload?.limit) || 20))
        const results = query
          ? tracks.filter((t) => `${t.title} ${t.artist} ${t.album} ${t.genre || ''}`.toLowerCase().includes(query))
          : tracks
        reply('MUSIC_SEARCH_RESULTS', { query, results: results.slice(0, limit).map(trackSummary), total: results.length })
        break
      }
      case 'GET_TRACKS': {
        const limit = Math.min(100, Math.max(1, Number(payload?.limit) || 50))
        reply('MUSIC_TRACKS', { tracks: tracks.slice(0, limit).map(trackSummary), total: tracks.length })
        break
      }
      case 'TOGGLE_PLAY':
        togglePlay()
        break
      case 'PLAY':
      case 'RESUME':
        if (audioRef.current) {
          void audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
        } else togglePlay()
        break
      case 'PAUSE':
        audioRef.current?.pause()
        setIsPlaying(false)
        break
      case 'NEXT_TRACK':
        nextTrack()
        break
      case 'PREV_TRACK':
        prevTrack()
        break
      case 'SET_VOLUME':
        if (typeof payload?.volume === 'number' && payload.volume >= 0 && payload.volume <= 1) handleVolume(payload.volume)
        break
      case 'SEEK':
        if (typeof payload?.time === 'number' && Number.isFinite(payload.time) && payload.time >= 0) handleSeek(payload.time)
        break
      case 'GET_STATE':
        reply('PLAYBACK_STATE', {
          isPlaying,
          currentTrack: currentTrack ? trackSummary(currentTrack) : null,
          currentTrackId: currentTrack?.id || null,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          volume,
          queue: queue.map((t) => t.id),
        })
        break
      case 'GET_COMMENTS': {
        const requestedId = typeof payload?.trackId === 'string' ? payload.trackId : currentTrack?.id || ''
        const track = tracks.find((item) => item.id === requestedId || item.postId === requestedId)
        const postId = track?.postId || track?.id || ''
        if (!track || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId) || !supabase) {
          reply('MUSIC_COMMENTS', { trackId: requestedId, comments: [], error: 'Comments are available for published audio posts only' })
          break
        }
        const { data, error } = await supabase.from('feed_comments')
          .select('id,user_id,user_name,user_avatar,body,created_at')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .limit(100)
        reply('MUSIC_COMMENTS', {
          trackId: requestedId,
          comments: error ? [] : (data || []).map((item) => ({
            id: item.id, userName: item.user_name, userAvatar: item.user_avatar,
            body: item.body, createdAt: item.created_at,
          })),
          error: error?.message || null,
        })
        break
      }
      case 'POST_COMMENT': {
        const requestedId = typeof payload?.trackId === 'string' ? payload.trackId : currentTrack?.id || ''
        const body = typeof payload?.text === 'string' ? payload.text.trim().slice(0, 2000) : ''
        const track = tracks.find((item) => item.id === requestedId || item.postId === requestedId)
        const postId = track?.postId || track?.id || ''
        if (payload?.confirmed !== true) {
          reply('MUSIC_ACTION_RESULT', { action: type, ok: false, requiresConfirmation: true, error: 'Explicit confirmation is required before publishing a comment' })
          break
        }
        if (!track || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId) || !body || !supabase) {
          reply('MUSIC_ACTION_RESULT', { action: type, ok: false, error: 'A published track, comment text, and Supabase connection are required' })
          break
        }
        const { data: authData } = await supabase.auth.getSession()
        const session = authData.session
        if (!session) {
          reply('MUSIC_ACTION_RESULT', { action: type, ok: false, error: 'Sign in to comment' })
          break
        }
        const author = session.user
        const userName = String(author.user_metadata?.username || author.user_metadata?.full_name || author.email?.split('@')[0] || 'Kus-lord')
        const userAvatar = String(author.user_metadata?.avatar_url || author.user_metadata?.avatar || '👑')
        const { data, error } = await supabase.from('feed_comments').insert({
          post_id: postId, user_id: author.id, user_name: userName,
          user_avatar: userAvatar, body, comment_type: 'text',
        }).select('id,user_name,user_avatar,body,created_at').single()
        reply('MUSIC_ACTION_RESULT', {
          action: type,
          ok: !error && Boolean(data),
          comment: data ? { id: data.id, userName: data.user_name, userAvatar: data.user_avatar, body: data.body, createdAt: data.created_at } : null,
          error: error?.message || null,
        })
        break
      }
      case 'SET_QUEUE':
      case 'ADD_TO_QUEUE': {
        if (Array.isArray(payload?.trackIds)) {
          const requested = payload.trackIds.filter((id): id is string => typeof id === 'string')
          const resolved = requested.map((id) => tracks.find((t) => t.id === id || t.postId === id)).filter((t): t is Track => Boolean(t))
          if (resolved.length) {
            const nextQueue = type === 'ADD_TO_QUEUE'
              ? [...queue, ...resolved.filter((item) => !queue.some((queued) => queued.id === item.id))]
              : resolved
            setQueue(nextQueue)
            if (type === 'SET_QUEUE' && (!currentTrack || !nextQueue.some((t) => t.id === currentTrack.id))) playTrack(nextQueue[0], nextQueue)
            reply('MUSIC_ACTION_RESULT', { action: type, ok: true, queue: nextQueue.map((t) => t.id) })
          } else {
            reply('MUSIC_ACTION_RESULT', { action: type, ok: false, error: 'No requested tracks were found' })
          }
        }
        break
      }
      case 'CLEAR_QUEUE':
        setQueue(currentTrack ? [currentTrack] : [])
        reply('MUSIC_ACTION_RESULT', { action: type, ok: true })
        break
    }
  }, [allowedParentOrigins, tracks, queue, playTrack, togglePlay, nextTrack, prevTrack, currentTrack, currentTime, duration, volume])

  useEffect(() => {
    const embedded = window.parent !== window
    setIsEmbedded(embedded)
    if (embedded && parentOrigin && allowedParentOrigins.has(parentOrigin)) {
      window.parent.postMessage(
        { type: 'MUSIC_APP_READY', payload: { version: '1.1.0', capabilities: ['SEARCH_TRACKS', 'GET_TRACKS', 'PLAY_TRACK', 'SET_QUEUE', 'ADD_TO_QUEUE', 'CLEAR_QUEUE', 'GET_STATE', 'GET_COMMENTS', 'POST_COMMENT', 'LIKE_TRACK', 'PLAY', 'PAUSE', 'NEXT_TRACK', 'PREV_TRACK', 'SEEK', 'SET_VOLUME'] } },
        parentOrigin,
      )
    }
    window.addEventListener('message', handleParentMessage)
    return () => window.removeEventListener('message', handleParentMessage)
  }, [handleParentMessage, parentOrigin, allowedParentOrigins])

  useEffect(() => {
    if (!isEmbedded || !parentOrigin || !allowedParentOrigins.has(parentOrigin)) return
    sendParentMessage('PLAYBACK_STATE_UPDATE', {
      isPlaying,
      currentTrack: currentTrack ? {
        id: currentTrack.id,
        postId: currentTrack.postId || currentTrack.id,
        title: currentTrack.title,
        artist: currentTrack.artist,
        cover: currentTrack.cover,
      } : null,
      currentTrackId: currentTrack?.id || null,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      volume,
      queue: queue.map((t) => t.id),
    })
  }, [isEmbedded, parentOrigin, allowedParentOrigins, sendParentMessage, isPlaying, currentTrack, currentTime, duration, volume, queue])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => {
      const track = currentTrackRef.current
      const q = queueRef.current
      if (!track || q.length === 0) return
      const index = q.findIndex((t) => t.id === track.id)
      playTrack(q[(index + 1) % q.length], q)
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [playTrack])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign-out failed:', err)
    } finally {
      setAuthModalOpen(false)
      setUploadModalOpen(false)
    }
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
            const a = albums[0]
            if (a?.tracks.length) playTrack(a.tracks[0], a.tracks)
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
            const first = s.genre.split(' ')[0].toLowerCase()
            const t = tracks.find((x) => x.genre?.toLowerCase().includes(first)) || tracks[0]
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
          {tracks.filter((t) => t.isSportsAnthem).map((t) => (
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
      <PlaylistLibrary
        playlists={playlists}
        tracks={tracks}
        createdBy={user?.user_metadata?.username || user?.email?.split('@')[0] || 'You'}
        onChange={setPlaylists}
        onPlay={playTrack}
      />
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
              <span className="like-count">❤️ {t.likes || 0}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const toggleCurrentTrackLike = useCallback(() => {
    if (!currentTrack) return
    const targetId = currentTrack.id
    const nextLiked = !currentTrack.liked
    const nextLikes = Math.max(0, (currentTrack.likes || 0) + (nextLiked ? 1 : -1))
    const updateTrack = (track: Track): Track => track.id === targetId
      ? { ...track, liked: nextLiked, likes: nextLikes }
      : track
    setTracks((previous) => previous.map(updateTrack))
    setQueue((previous) => previous.map(updateTrack))
    setCurrentTrack((previous) => previous?.id === targetId ? updateTrack(previous) : previous)
  }, [currentTrack])

  const renderArtists = () => (
    <ArtistDirectory
      profiles={artistProfiles}
      tracks={tracks}
      onPlayTrack={playTrack}
      followedArtists={followedArtists}
      onToggleFollow={(artistName) => setFollowedArtists((previous) => {
        const next = new Set(previous)
        if (next.has(artistName)) next.delete(artistName)
        else next.add(artistName)
        return next
      })}
      currentUserId={user?.id}
      onSaveProfile={async (profileId: string | null, input: MusicArtistProfileInput) => {
        const result = await saveArtistProfile(profileId, input)
        if (result.id) {
          const refreshed = await fetchPublicArtistProfiles()
          setArtistProfiles(refreshed)
        }
        return result
      }}
    />
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
          {(() => {
            const external = parseMusicLink(search)
            if (!external) return null
            return (
              <section className="external-music-embed">
                <div className="section-title">
                  <h2>{external.platform === 'appleMusic' ? 'Apple Music' : external.platform === 'soundcloud' ? 'SoundCloud' : 'Spotify'} embed</h2>
                  <a href={external.openUrl} target="_blank" rel="noopener noreferrer">Open original ↗</a>
                </div>
                <iframe
                  title={`${external.platform} music player`}
                  src={external.embedUrl}
                  height={musicEmbedHeight(external.platform, external.resourceType)}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  referrerPolicy="strict-origin"
                  className="external-music-iframe"
                />
                <p>Playback is provided by the official platform player. Kus-Lords Music does not rehost external audio.</p>
              </section>
            )
          })()}
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
          activeTab={activeTab}
          onNavigateTab={setActiveTab}
        />
      </div>

      {/* Mobile Search Corner */}
      <button
        className={`search-corner ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => { setActiveTab('search'); setSelectedAlbumId(null) }}
        aria-label="Search"
      >
        ⌕
      </button>

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
              {activeTab === 'artists' && renderArtists()}
              {activeTab === 'search' && renderSearch()}
              {activeTab === 'studio' && (
                <Studio
                  tracks={studioTracks}
                  onPlayTrack={(track) => playTrack(track, studioTracks)}
                />
              )}
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
          <button className="mini-ctrl" onClick={(e) => { e.stopPropagation(); setCommentsTrack(currentTrack) }} title="Comments" aria-label="Open comments">
            💬
          </button>
        </div>
      )}

      {/* Full Screen Player */}
      {miniPlayerOpen && renderFullPlayer()}

      {/* Bottom Navigation (Mobile) */}
      <nav className="bottom-nav">
        <div className="nav-group">
          {(['home', 'browse'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab); setSelectedAlbumId(null) }}
            >
              <span className="nav-icon">{tab === 'home' ? '🏠' : '🆕'}</span>
              <span className="nav-label">{tab === 'home' ? 'Home' : 'Browse'}</span>
            </button>
          ))}
        </div>

        <button
          className={`nav-tab studio-tab ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => { setActiveTab('studio'); setSelectedAlbumId(null) }}
          aria-label="Open Studio"
        >
          <span className="nav-icon">🎛</span>
          <span className="nav-label">Studio</span>
        </button>

        <div className="nav-group">
          {(['radio', 'library', 'artists'] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab); setSelectedAlbumId(null) }}
            >
              <span className="nav-icon">{tab === 'radio' ? '📻' : tab === 'library' ? '📚' : '🎤'}</span>
              <span className="nav-label">{tab === 'radio' ? 'Radio' : tab === 'library' ? 'Library' : 'Artists'}</span>
            </button>
          ))}
        </div>
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
          onOpenComments={currentTrack ? () => setCommentsTrack(currentTrack) : undefined}
          liked={currentTrack?.liked}
          likes={currentTrack?.likes}
          onToggleLike={currentTrack ? toggleCurrentTrackLike : undefined}
        />
      </div>

      {/* Modals */}
      <CommentsPanel track={commentsTrack} user={user} onClose={() => setCommentsTrack(null)} />
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