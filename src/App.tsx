import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type Album, type Track } from './data/music'
import { fetchPublicArtistProfiles, fetchRemoteTracks, saveArtistProfile, supabase, type MusicArtistProfileInput, type PublicMusicArtistProfile } from './lib/supabase'
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
import { fetchMusicPlaylists, createCloudPlaylist, addCloudPlaylistTrack, removeCloudPlaylistTrack, moveCloudPlaylistTrack, deleteCloudPlaylist, updateCloudPlaylistVisibility, type MusicPlaylist } from './lib/playlists'
import { fetchFollowedArtists, toggleCloudArtistFollow } from './lib/artistFollows'
import { musicEmbedHeight, parseMusicLink } from './lib/musicEmbeds'
import { recordVerifiedDirectStream } from './lib/streamTracking'
import { toggleMusicTrackLike } from './lib/trackLikes'
import { useAuth } from './context/AuthContext'
import RoyalCompanion from './components/RoyalCompanion'
import TrendFollowPanel from './components/TrendFollowPanel'
import './index.css'

type Tab = 'home' | 'browse' | 'radio' | 'library' | 'search' | 'studio' | 'artists'
type ExternalCatalogHit = {
  id: string
  title: string
  artist: string
  coverUrl: string
  embedUrl: string
  openUrl: string
  platform: string
  kind: 'track' | 'artist' | 'album'
  duration: number
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const { user, signOut } = useAuth()

  // The shared Supabase audio feed is the only catalogue source.
  const [tracks, setTracks] = useState<Track[]>([])
  const [libraryStatus, setLibraryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [artistProfiles, setArtistProfiles] = useState<PublicMusicArtistProfile[]>([])
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)
  const [playlistsError, setPlaylistsError] = useState('')
  const [commentsTrack, setCommentsTrack] = useState<Track | null>(null)
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set())

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [externalSearchResults, setExternalSearchResults] = useState<ExternalCatalogHit[]>([])
  const [externalSearchHint, setExternalSearchHint] = useState('')
  const [externalSearchLoading, setExternalSearchLoading] = useState(false)
  const [activeExternalHit, setActiveExternalHit] = useState<ExternalCatalogHit | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [likeBusy, setLikeBusy] = useState(false)
  const [likeError, setLikeError] = useState('')
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [shuffleEnabled, setShuffleEnabled] = useState(false)
  const [repeatEnabled, setRepeatEnabled] = useState(false)
  const [muted, setMuted] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [miniPlayerOpen, setMiniPlayerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [isEmbedded, setIsEmbedded] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])
  const shuffleRef = useRef(false)
  const repeatRef = useRef(false)

  useEffect(() => { currentTrackRef.current = currentTrack }, [currentTrack])
  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { shuffleRef.current = shuffleEnabled }, [shuffleEnabled])
  useEffect(() => { repeatRef.current = repeatEnabled }, [repeatEnabled])
  useEffect(() => { if (audioRef.current) audioRef.current.muted = muted }, [muted])

  // Load the live SCN-compatible audio inventory. Empty/error states stay empty.
  useEffect(() => {
    let cancelled = false
    fetchRemoteTracks()
      .then((data) => {
        if (cancelled) return
        setTracks(Array.isArray(data?.tracks) ? data.tracks : [])
        setLibraryStatus(data.status === 'error' || data.status === 'fallback' ? 'error' : 'ready')
      })
      .catch((err) => {
        console.error('Could not load cloud library:', err)
        if (!cancelled) {
          setTracks([])
          setLibraryStatus('error')
        }
      })
    return () => { cancelled = true }
  }, [])

  // Keep the catalogue live as SCN audio posts are published, edited, or removed.
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('kus-music-live-audio-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts', filter: 'post_type=eq.audio' }, () => {
        void fetchRemoteTracks().then((data) => {
          setTracks(Array.isArray(data.tracks) ? data.tracks : [])
          setLibraryStatus(data.status === 'error' || data.status === 'fallback' ? 'error' : 'ready')
        }).catch((err) => {
          console.error('Live music refresh failed:', err)
          setLibraryStatus('error')
        })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  const refreshPlaylists = useCallback(async () => {
    if (!user) {
      setPlaylists([])
      setPlaylistsError('')
      setPlaylistsLoading(false)
      return
    }
    setPlaylistsLoading(true)
    setPlaylistsError('')
    try {
      setPlaylists(await fetchMusicPlaylists())
    } catch (error) {
      setPlaylists([])
      setPlaylistsError(error instanceof Error ? error.message : 'Cloud playlists are unavailable.')
    } finally {
      setPlaylistsLoading(false)
    }
  }, [user])

  const refreshFollowedArtists = useCallback(async () => {
    if (!user) {
      setFollowedArtists(new Set())
      return
    }
    try {
      setFollowedArtists(await fetchFollowedArtists())
    } catch (error) {
      console.error('Could not load artist follows:', error)
      setFollowedArtists(new Set())
    }
  }, [user])

  useEffect(() => {
    void refreshPlaylists()
    void refreshFollowedArtists()
    if (!user || !supabase) return
    const channel = supabase
      .channel(`kus-music-user-library-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_playlists', filter: `user_id=eq.${user.id}` }, () => { void refreshPlaylists() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_playlist_tracks' }, () => { void refreshPlaylists() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_follows', filter: `user_id=eq.${user.id}` }, () => { void refreshFollowedArtists() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user, refreshPlaylists, refreshFollowedArtists])

  // Search the live Spotify catalogue through the server-side provider endpoint.
  // Provider credentials never enter the browser bundle.
  useEffect(() => {
    const query = search.trim()
    if (!query || parseMusicLink(query)) {
      setExternalSearchResults([])
      setExternalSearchHint('')
      setExternalSearchLoading(false)
      setActiveExternalHit(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setExternalSearchLoading(true)
      fetch(`/api/music/search?q=${encodeURIComponent(query)}&limit=18`)
        .then(async (response) => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.hint || 'External music search failed.')
          return data as { items?: ExternalCatalogHit[]; hint?: string }
        })
        .then((data) => {
          if (cancelled) return
          setExternalSearchResults(Array.isArray(data.items) ? data.items : [])
          setExternalSearchHint(data.hint || '')
        })
        .catch((error) => {
          if (cancelled) return
          setExternalSearchResults([])
          setExternalSearchHint(error instanceof Error ? error.message : 'External music search is unavailable.')
        })
        .finally(() => { if (!cancelled) setExternalSearchLoading(false) })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [search])

  // Public SCN artist profiles and storefront metadata, refreshed on database changes.
  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      void fetchPublicArtistProfiles().then((profiles) => {
        if (!cancelled) setArtistProfiles(profiles)
      })
    }
    refresh()
    if (!supabase) return () => { cancelled = true }
    const channel = supabase
      .channel('kus-music-live-artist-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_profiles' }, refresh)
      .subscribe()
    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [])

  // Audio element setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
    }
    const audio = audioRef.current
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      const track = currentTrackRef.current
      if (track?.postId && audio.currentTime >= 30) {
        void recordVerifiedDirectStream(track.postId, audio.currentTime, audio.duration || 0)
      }
    }
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [volume])

  // Build album groupings from actual published audio metadata.
  const albums = useMemo(() => {
    const groups = new Map<string, Track[]>()
    for (const track of tracks) {
      const title = track.album?.trim() || 'Singles'
      const group = groups.get(title) || []
      group.push(track)
      groups.set(title, group)
    }
    return Array.from(groups.entries()).map(([title, items], index): Album => ({
      id: `live-album-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title,
      artist: Array.from(new Set(items.map((track) => track.artist).filter(Boolean))).join(', ') || 'Various artists',
      description: `${items.length} published track${items.length === 1 ? '' : 's'}`,
      cover: items[0]?.cover || '',
      category: 'vibes',
      tracks: items,
    }))
  }, [tracks])

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

  const studioTracks = tracks

  const handleCreatePlaylist = useCallback(async (name: string) => {
    await createCloudPlaylist(name)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleAddPlaylistTrack = useCallback(async (playlistId: string, track: Track) => {
    const playlist = playlists.find((item) => item.id === playlistId)
    await addCloudPlaylistTrack(playlistId, track, playlist?.trackIds.length || 0)
    await refreshPlaylists()
  }, [playlists, refreshPlaylists])

  const handleRemovePlaylistTrack = useCallback(async (playlistId: string, trackId: string) => {
    await removeCloudPlaylistTrack(playlistId, trackId)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleMovePlaylistTrack = useCallback(async (playlistId: string, trackId: string, direction: -1 | 1) => {
    await moveCloudPlaylistTrack(playlistId, trackId, direction)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleDeletePlaylist = useCallback(async (playlistId: string) => {
    await deleteCloudPlaylist(playlistId)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleUpdatePlaylistVisibility = useCallback(async (playlistId: string, visibility: 'private' | 'public') => {
    await updateCloudPlaylistVisibility(playlistId, visibility)
    await refreshPlaylists()
  }, [refreshPlaylists])

  const handleToggleTrackLike = useCallback(async () => {
    if (!currentTrack || !user || likeBusy) return
    setLikeBusy(true)
    setLikeError('')
    try {
      const liked = await toggleMusicTrackLike(currentTrack.postId || currentTrack.id)
      const update = (track: Track): Track => track.id === currentTrack.id
        ? { ...track, liked, likes: Math.max(0, Number(track.likes || 0) + (liked ? 1 : -1)) }
        : track
      setTracks((previous) => previous.map(update))
      setQueue((previous) => previous.map(update))
      setCurrentTrack((previous) => previous?.id === currentTrack.id ? update(previous) : previous)
    } catch (cause) {
      setLikeError(cause instanceof Error ? cause.message : 'Could not update this like.')
    } finally {
      setLikeBusy(false)
    }
  }, [currentTrack, user, likeBusy])

  const handleToggleArtistFollow = useCallback(async (artistProfileId: string) => {
    const following = await toggleCloudArtistFollow(artistProfileId)
    setFollowedArtists((previous) => {
      const next = new Set(previous)
      if (following) next.add(artistProfileId)
      else next.delete(artistProfileId)
      return next
    })
  }, [])

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
    if (shuffleRef.current && q.length > 1) {
      const choices = q.filter((item) => item.id !== track.id)
      const selected = choices[Math.floor(Math.random() * choices.length)]
      if (selected) playTrack(selected, q)
      return
    }
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

  const toggleMute = () => setMuted((previous) => !previous)
  const toggleShuffle = () => setShuffleEnabled((previous) => !previous)
  const toggleRepeat = () => setRepeatEnabled((previous) => !previous)

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
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      cover: track.cover,
      genre: track.genre || null,
      audioUrl: track.audioUrl,
    })

    switch (type) {
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
        { type: 'MUSIC_APP_READY', payload: { version: '1.2.0', capabilities: ['SEARCH_TRACKS', 'GET_TRACKS', 'PLAY_TRACK', 'SET_QUEUE', 'ADD_TO_QUEUE', 'CLEAR_QUEUE', 'GET_STATE', 'GET_COMMENTS', 'POST_COMMENT', 'PLAY', 'PAUSE', 'NEXT_TRACK', 'PREV_TRACK', 'SEEK', 'SET_VOLUME'] } },
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
      if (track.postId) void recordVerifiedDirectStream(track.postId, audio.duration || audio.currentTime, audio.duration || 0, true)
      if (repeatRef.current) {
        audio.currentTime = 0
        void audio.play().catch((error) => console.error('Could not repeat current track:', error))
        setCurrentTime(0)
        return
      }
      nextTrack()
    }
    audio.addEventListener('ended', handleEnded)
    return () => audio.removeEventListener('ended', handleEnded)
  }, [nextTrack])

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
        <span className="hero-tag">KUS-LORDS MUSIC</span>
        <h1>Your music, from the shared SCN catalogue.</h1>
        <p>New releases and creator uploads appear here as they are published.</p>
        <div className="hero-actions">
          <button className="hero-upload" onClick={() => setUploadModalOpen(true)}>Upload music</button>
        </div>
      </div>
      <section>
        <div className="section-title"><h2>Recently published</h2></div>
        {libraryStatus === 'loading' ? <div className="empty">Loading the live music catalogue…</div>
          : libraryStatus === 'error' ? <div className="empty">The live music catalogue could not be reached. Check the Supabase connection and access policies.</div>
          : albums.length === 0 ? <div className="empty">No music has been published yet. Upload the first track to get started.</div>
          : <div className="album-grid">{albums.map((a) => (
            <AlbumCard key={a.id} album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)} />
          ))}</div>}
      </section>
    </div>
  )

    const renderBrowse = () => {
    const genres = Array.from(new Set(tracks.map((track) => track.genre?.trim()).filter((genre): genre is string => Boolean(genre))))
    return (
      <div className="tab-scroll">
        <div className="section-title"><h2>Browse music</h2></div>
        <TrendFollowPanel />
        <div className="genre-strip">
          {genres.map((genre) => <button key={genre} className="genre-chip" onClick={() => setSearch(genre)}>{genre}</button>)}
        </div>
        <section>
          <div className="section-title"><h2>Albums & releases</h2></div>
          {albums.length ? <div className="album-grid">{albums.map((a) => (
            <AlbumCard key={a.id} album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)} />
          ))}</div> : <div className="empty">{libraryStatus === 'loading' ? 'Loading published music…' : 'No published releases are available yet.'}</div>}
        </section>
      </div>
    )
  }

    const renderRadio = () => {
    const genres = Array.from(new Set(tracks.map((track) => track.genre?.trim()).filter((genre): genre is string => Boolean(genre))))
    return (
      <div className="tab-scroll">
        <div className="section-title"><h2>Genre radio</h2></div>
        <p className="caption">Stations are generated from genres present in the live catalogue.</p>
        {genres.length ? <div className="radio-stations">
          {genres.map((genre) => {
            const stationTracks = tracks.filter((track) => track.genre?.trim() === genre)
            return <button type="button" key={genre} className="radio-card" onClick={() => playTrack(stationTracks[0], stationTracks)}>
              <div className="radio-art"><span className="radio-icon">♫</span></div>
              <strong>{genre}</strong><span>{stationTracks.length} track{stationTracks.length === 1 ? '' : 's'}</span>
            </button>
          })}
        </div> : <div className="empty">Genre radio will appear when published tracks include genre metadata.</div>}
      </div>
    )
  }

    const renderLibrary = () => (
    <div className="tab-scroll">
      <div className="section-title"><h2>Your Library</h2></div>
      <section>
        <div className="section-title"><h2>Published releases</h2></div>
        {albums.length ? <div className="album-grid">{albums.map((a) => (
          <AlbumCard key={a.id} album={a}
            onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
            onSelect={() => setSelectedAlbumId(a.id)} />
        ))}</div> : <div className="empty">Your published music library is empty.</div>}
      </section>
      <section>
        <div className="section-title"><h2>Recently added tracks</h2></div>
        <div className="track-list-compact">
          {tracks.slice(0, 12).map((t) => (
            <div key={t.id} className="track-row-compact" onClick={() => playTrack(t, tracks)}>
              <div className="mini-cover" style={{ background: t.cover }} />
              <div className="track-meta"><strong>{t.title}</strong><span>{t.artist}</span></div>
            </div>
          ))}
        </div>
        {!tracks.length && <div className="empty">No published tracks yet.</div>}
      </section>
    </div>
  )

  const renderPlaylists = () => (
    <div className="tab-scroll">
      <div className="section-title"><h2>Your Playlists</h2></div>
            <PlaylistLibrary
              playlists={playlists}
              tracks={tracks}
              loading={playlistsLoading}
              error={playlistsError}
              onCreate={handleCreatePlaylist}
              onAddTrack={handleAddPlaylistTrack}
              onRemoveTrack={handleRemovePlaylistTrack}
              onDeletePlaylist={handleDeletePlaylist}
              onUpdateVisibility={handleUpdatePlaylistVisibility}
              onMoveTrack={handleMovePlaylistTrack}
              onPlay={playTrack}
            />
    </div>
  )

  const renderArtists = () => (
    <ArtistDirectory
      profiles={artistProfiles}
      tracks={tracks}
      onPlayTrack={playTrack}
      followedArtists={followedArtists}
      onToggleFollow={handleToggleArtistFollow}
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
          <section className="external-catalog-results">
            <div className="section-title"><h2>External catalogue</h2><span className="caption">Live Spotify, YouTube and Apple Music results</span></div>
            {externalSearchLoading && <div className="empty">Searching connected music providers…</div>}
            {externalSearchHint && <div className="empty">{externalSearchHint}</div>}
            {externalSearchResults.map((item) => (
              <button type="button" className="track-row-compact external-catalog-hit" key={item.id} onClick={() => setActiveExternalHit(item)}>
                {item.coverUrl ? <img src={item.coverUrl} alt="" className="mini-cover" /> : <span className="mini-cover" />}
                <span className="track-meta"><strong>{item.title}</strong><span>{item.artist} · {item.kind}</span></span>
                <span className="caption">Preview</span>
              </button>
            ))}
            {activeExternalHit && (
              <div className="external-music-embed">
                <div className="section-title">
                  <h2>{activeExternalHit.title}</h2>
                  <a href={activeExternalHit.openUrl} target="_blank" rel="noopener noreferrer">Open on {activeExternalHit.platform} ↗</a>
                </div>
                <iframe title={`${activeExternalHit.title} official music embed`} src={activeExternalHit.embedUrl} height={activeExternalHit.kind === 'track' ? 152 : 352} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="external-music-iframe" />
                <button type="button" className="clear-search" onClick={() => setActiveExternalHit(null)}>Close preview</button>
              </div>
            )}
          </section>
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
              <h2>{currentTrack.title}</h2>
              <p>{currentTrack.artist}</p>
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
              {activeTab === 'playlists' && renderPlaylists()}
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
          {(['home', 'search'] as Tab[]).map((tab) => (
            <button key={tab} className={`nav-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setSelectedAlbumId(null) }}>
              <span className="nav-icon">{tab === 'home' ? '🏠' : '⌕'}</span>
              <span className="nav-label">{tab === 'home' ? 'Home' : 'Search'}</span>
            </button>
          ))}
        </div>
        <button className={`nav-tab studio-tab ${activeTab === 'studio' ? 'active' : ''}`} onClick={() => { setActiveTab('studio'); setSelectedAlbumId(null) }} aria-label="Open Studio">
          <span className="nav-icon">🎛</span><span className="nav-label">Studio</span>
        </button>
        <div className="nav-group">
          {(['browse', 'playlists', 'library'] as Tab[]).map((tab) => (
            <button key={tab} className={`nav-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setSelectedAlbumId(null) }}>
              <span className="nav-icon">{tab === 'browse' ? '🧭' : tab === 'playlists' ? '♫' : '📚'}</span>
              <span className="nav-label">{tab === 'browse' ? 'Explore' : tab === 'playlists' ? 'Playlists' : 'Library'}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Player */}
      {currentTrack && <div className="desktop-player">
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
          liked={currentTrack.liked}
          likes={currentTrack.likes || 0}
          onToggleLike={user ? handleToggleTrackLike : undefined}
          likeBusy={likeBusy}
          shuffle={shuffleEnabled}
          repeat={repeatEnabled}
          muted={muted}
          onToggleShuffle={toggleShuffle}
          onToggleRepeat={toggleRepeat}
          onToggleMute={toggleMute}
        />
        {likeError && <p className="player-action-error" role="alert">{likeError}</p>}
      </div>}

      <RoyalCompanion activeTab={activeTab} currentTrack={currentTrack ? { title: currentTrack.title, artist: currentTrack.artist, album: currentTrack.album } : null} />

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