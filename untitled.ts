PATH: src/lib/supabase.ts
```
import { createClient } from '@supabase/supabase-js'
import type { Track } from '../data/music'

// Shared Supabase config - MUST match sport-clan-nexus hub
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Auth storage key shared across the constellation
export const AUTH_STORAGE_KEY = 'kus-lords-auth'

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Fallback tracks (matching sport-clan-nexus data exactly)
const gradient = (colors: string) => linear-gradient(135deg, ${colors})

const fallbackTracks: Track[] = [
  {
    id: 't-sports-1',
    title: 'Champions Arena Anthem',
    artist: 'Royal Kus-Lords Brass',
    album: 'Matchday Stadium Hype',
    duration: 310,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover: gradient('#d4af37, #855800'),
    genre: 'Stadium Anthem',
    isSportsAnthem: true,
    matchVibe: 'Pre-Match Tunnel Walkout',
    likes: 1420,
  },
  {
    id: 't-sports-2',
    title: 'Final Whistle Victory',
    artist: 'Dynasty Sound Squad',
    album: 'Matchday Stadium Hype',
    duration: 278,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover: gradient('#e6c656, #2d1800'),
    genre: 'High Energy',
    isSportsAnthem: true,
    matchVibe: 'Trophy Celebration',
    likes: 980,
  },
  {
    id: 't-sports-3',
    title: 'Dream League Goal Frenzy',
    artist: 'Pulse Arena',
    album: 'Fantasy League Beats',
    duration: 295,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover: gradient('#ff6b6b, #c5a059'),
    genre: 'Electronic / Bass',
    isSportsAnthem: true,
    matchVibe: 'Halftime Energy',
    likes: 854,
  },
  {
    id: 't-sports-4',
    title: '90th Minute Stoppage Time',
    artist: 'Apex Strikers',
    album: 'Fantasy League Beats',
    duration: 330,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    cover: gradient('#1e3c72, #2a5298'),
    genre: 'Epic Orchestral',
    isSportsAnthem: true,
    matchVibe: 'Clutch Comeback',
    likes: 1120,
  },
  {
    id: 't1',
    title: 'Midnight Highway Drive',
    artist: 'Neon Coast',
    album: 'Midnight Highway',
    duration: 368,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    cover: gradient('#f857a6, #614ad2'),
    genre: 'Synthwave',
    likes: 640,
  },
  {
    id: 't2',
    title: 'Royal Crown Serenade',
    artist: 'The Velvet Shores',
    album: 'Coastal Lights & Gold',
    duration: 412,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    cover: gradient('#f5af19, #e65c00'),
    genre: 'Afro Chill',
    likes: 830,
  },
  {
    id: 't3',
    title: 'Glass Waves & Aurora',
    artist: 'Polar Nights',
    album: 'Aurora Borealis',
    duration: 291,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    cover: gradient('#00c9ff, #7b2fff'),
    genre: 'Ambient Chill',
    likes: 540,
  },
  {
    id: 't4',
    title: 'Silk City Skyline',
    artist: 'Marble Sky',
    album: 'Neo Tokyo',
    duration: 335,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    cover: gradient('#f6d365, #fda085'),
    genre: 'Lo-Fi Chill',
    likes: 420,
  },
  {
    id: 't5',
    title: 'Lagos to Accra Grooves',
    artist: 'Kus-Lords Allstars',
    album: 'Royal Afro Beats',
    duration: 254,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    cover: gradient('#11998e, #38ef7d'),
    genre: 'Afrobeats',
    likes: 1530,
  },
  {
    id: 't6',
    title: 'Pacific St. Drift',
    artist: 'Lush Coast',
    album: 'Pacific Waves',
    duration: 402,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    cover: gradient('#13547a, #80d0c7'),
    genre: 'Deep House',
    likes: 710,
  },
  {
    id: 't7',
    title: 'Kuslords Golden Anthem',
    artist: 'Clan Nexus Symphony',
    album: 'Nexus Sovereign',
    duration: 315,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    cover: gradient('#e6c656, #f37335'),
    genre: 'Royal Anthem',
    isSportsAnthem: true,
    matchVibe: 'Sovereign Match Intro',
    likes: 2100,
  },
  {
    id: 't8',
    title: 'Vapor Run Horizon',
    artist: 'Chrome Pulse',
    album: 'Midnight Highway',
    duration: 356,
    audioUrl: 'soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    cover: gradient('#7f5fff, #ff7fff'),
    genre: 'Synthwave',
    likes: 670,
  },
]

interface DbTrack {
  id: string
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  audio_url: string
  cover_url: string | null
  created_at: string
}

export async function fetchRemoteTracks(): Promise<Track[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return Promise.resolve(fallbackTracks)
  }

  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return Promise.resolve(fallbackTracks)
    }

    const fetched: Track[] = data.map((d: DbTrack) => ({
      id: d.id,
      title: d.title,
      artist: d.artist || 'Unknown Artist',
      album: d.album || 'Single',
      duration: d.duration || 210,
      audioUrl: d.audio_url,
      cover: d.cover_url || gradient('#fa2d6c, #fc6f60'),
    }))

    return Promise.resolve([...fetched, ...fallbackTracks])
  } catch {
    return Promise.resolve(fallbackTracks)
  }
}

// Upload to shared buckets (music-audio, music-covers)
export async function uploadTrackToBucket(params: {
  title: string
  artist: string
  album: string
  audioFile: File
  coverFile: File | null
  user: { id: string }
}): Promise<Track | null> {
  if (!isSupabaseConfigured() || !supabase) {
    // Local fallback
    const audioUrl = URL.createObjectURL(params.audioFile)
    let coverUrl = gradient('#d4af37, #1a1a24')
    if (params.coverFile) coverUrl = URL.createObjectURL(params.coverFile)

    return {
      id: uploaded-${Date.now()},
      title: params.title,
      artist: params.artist,
      album: params.album,
      duration: 210,
      audioUrl,
      cover: coverUrl,
    }
  }

  try {
    const fileExt = params.audioFile.name.split('.').pop()
    const fileName = ${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}
    const filePath = tracks/${fileName}

    const { error: uploadError } = await supabase.storage
      .from('music-audio')
      .upload(filePath, params.audioFile)

    if (uploadError) throw uploadError

    const { data: { publicUrl: audioPublicUrl } } = supabase.storage
      .from('music-audio')
      .getPublicUrl(filePath)

    let coverPublicUrl = gradient('#d4af37, #1a1a24')
    if (params.coverFile) {
      const coverExt = params.coverFile.name.split('.').pop()
      const coverName = ${Date.now()}-cover.${coverExt}
      const coverPath = covers/${coverName}
      const { error: coverErr } = await supabase.storage
        .from('music-covers')
        .upload(coverPath, params.coverFile)

      if (!coverErr) {
        const { data: { publicUrl } } = supabase.storage
          .from('music-covers')
          .getPublicUrl(coverPath)
        coverPublicUrl = publicUrl
      }
    }

    // Save to shared music_tracks table
    const { error: dbError } = await supabase.from('music_tracks').insert([
      {
        title: params.title,
        artist: params.artist,
        album: params.album,
        audio_url: audioPublicUrl,
        cover_url: coverPublicUrl,
        duration: 240,
        user_id: params.user.id,
      },
    ])

    if (dbError) {
      console.warn('DB insert notice:', dbError.message)
    }

    return {
      id: fileName,
      title: params.title,
      artist: params.artist,
      album: params.album,
      duration: 240,
      audioUrl: audioPublicUrl,
      cover: coverPublicUrl,
    }
  } catch (err: any) {
    console.error('Upload failed:', err)
    return null
  }
}
```

PATH: src/context/AuthContext.tsx
```
import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, AUTH_STORAGE_KEY } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  role: 'member' | 'creator' | 'vip'
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  uploadTrackToSupabase: (file: File, coverFile: File | null, meta: { title: string; artist: string; album: string }) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Demo guest state for preview - read from SHARED constellation key
      const localGuest = localStorage.getItem(AUTH_STORAGE_KEY)
      if (localGuest) {
        try {
          const parsed = JSON.parse(localGuest)
          if (parsed?.user) {
            setProfile({
              id: parsed.user.id || 'u-kuslord',
              email: parsed.user.email || 'royal@kuslords.club',
              fullName: parsed.user.user_metadata?.username || parsed.user.email?.split('@')[0] || 'Kuslord VIP',
              avatarUrl: parsed.user.user_metadata?.avatar_url,
              role: 'vip',
            })
          }
        } catch {
          // ignore
        }
      }
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncProfile(session.user)
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncProfile(session.user)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  function syncProfile(authUser: User) {
    const p: UserProfile = {
      id: authUser.id,
      email: authUser.email || '',
      fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kus-lord VIP',
      avatarUrl: authUser.user_metadata?.avatar_url,
      role: (authUser.user_metadata?.role as 'member' | 'creator' | 'vip') || 'vip',
    }
    setProfile(p)
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      const demoProfile: UserProfile = {
        id: 'demo-user-1',
        email,
        fullName: email.split('@')[0] || 'Royal User',
        role: 'vip',
      }
      setProfile(demoProfile)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: demoProfile }))
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured()) {
      const demoProfile: UserProfile = {
        id: 'demo-user-1',
        email,
        fullName: fullName || email.split('@')[0],
        role: 'vip',
      }
      setProfile(demoProfile)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: demoProfile }))
      return { error: null }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'creator',
        },
      },
    })
    return { error }
  }

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase URL/Key not configured yet. Using local demo mode.') }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Google OAuth requires Supabase configuration.') }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signOut = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const uploadTrackToSupabase = async (
    file: File,
    coverFile: File | null,
    meta: { title: string; artist: string; album: string }
  ) => {
    if (!isSupabaseConfigured() || !supabase) {
      // Local fallback blob storage for immediate testing
      const audioUrl = URL.createObjectURL(file)
      let coverUrl = 'linear-gradient(135deg, #d4af37, #1a1a24)'
      if (coverFile) {
        coverUrl = URL.createObjectURL(coverFile)
      }

      const customTrack = {
        id: uploaded-${Date.now()},
        title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: meta.artist || profile?.fullName || 'Kus-lord Artist',
        album: meta.album || 'Personal Releases',
        duration: 210,
        audioUrl,
        cover: coverUrl,
      }

      const stored = localStorage.getItem('kus_custom_tracks')
      const tracks = stored ? JSON.parse(stored) : []
      tracks.unshift(customTrack)
      localStorage.setItem('kus_custom_tracks', JSON.stringify(tracks))
      window.dispatchEvent(new Event('kus_tracks_updated'))
      return { success: true }
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = ${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}
      const filePath = tracks/${fileName}

      const { error: uploadError } = await supabase.storage
        .from('music-audio')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl: audioPublicUrl } } = supabase.storage
        .from('music-audio')
        .getPublicUrl(filePath)

      let coverPublicUrl = 'linear-gradient(135deg, #d4af37, #1a1a24)'
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverName = ${Date.now()}-cover.${coverExt}
        const coverPath = covers/${coverName}
        const { error: coverErr } = await supabase.storage
          .from('music-covers')
          .upload(coverPath, coverFile)

        if (!coverErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('music-covers')
            .getPublicUrl(coverPath)
          coverPublicUrl = publicUrl
        }
      }

      // Save row in music_tracks table
      const { error: dbError } = await supabase.from('music_tracks').insert([
        {
          title: meta.title || file.name,
          artist: meta.artist || profile?.fullName || 'Kus-lord Artist',
          album: meta.album || 'Royal Exclusives',
          audio_url: audioPublicUrl,
          cover_url: coverPublicUrl,
          duration: 240,
          user_id: user?.id,
        },
      ])

      if (dbError) {
        console.warn('DB insert notice (table might not exist yet):', dbError.message)
      }

      window.dispatchEvent(new Event('kus_tracks_updated'))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured(),
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
        uploadTrackToSupabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

PATH: src/App.tsx
```
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { albums as defaultAlbums, type Album, type Track } from './data/music'
import { supabase, fetchRemoteTracks, AUTH_STORAGE_KEY } from './lib/supabase'
import Sidebar from './components/Sidebar'
import AlbumCard from './components/AlbumCard'
import PlaylistView from './components/PlaylistView'
import PlayerBar from './components/PlayerBar'
import AuthModal from './components/AuthModal'
import UploadModal from './components/UploadModal'
import SportsSection from './components/SportsSection'
import { useAuth } from './context/AuthContext'
import './index.css'

type Tab = 'home' | 'browse' | 'radio' | 'library' | 'search'

export default function App() {
  const { user, isLoading } = useAuth()
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

  // Detect embedded mode (inside sport-clan-nexus iframe)
  useEffect(() => {
    const checkEmbedded = () => {
      try {
        const embedded = window.parent !== window && window.parent !== undefined
        setIsEmbedded(embedded)
        
        // Notify parent we're ready
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
  }, [])

  // Handle messages from parent (sport-clan-nexus hub)
  const handleParentMessage = useCallback((event: MessageEvent) => {
    // In production, validate: if (event.origin !== TRUSTED_ORIGIN) return;
    // TRUSTED_ORIGIN = 'sport-clan-nexus.vercel.app' or localhost:3000
    
    if (!event.data || typeof event.data !== 'object') return
    
    const { type, payload } = event.data
    
    switch (type) {
      case 'PLAY_ANTHEM': {
        if (typeof payload?.matchId === 'string') {
          // Find match in sports data
          import('./data/sports').then(({ sportsMatches }) => {
            const match = sportsMatches.find(m => m.id === payload.matchId)
            if (match && match.anthemTrackId) {
              const track = tracks.find(t => t.id === match.anthemTrackId)
              if (track) {
                playTrack(track, tracks)
                // Confirm to parent
                event.source?.postMessage(
                  { type: 'ANTHEM_PLAYING', payload: { matchId: payload.matchId, trackId: track.id } },
                  event.origin
                )
              }
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
          const newQueue = payload.trackIds.map((id: string) => tracks.find(t => t.id === id)).filter(Boolean) as Track[]
          if (newQueue.length > 0) {
            setQueue(newQueue)
            playTrack(newQueue[0], newQueue)
          }
        }
        break
    }
  }, [tracks, playTrack, togglePlay, nextTrack, prevTrack, handleVolume, handleSeek])

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

  // Initial track & session loading
  useEffect(() => {
    fetchRemoteTracks().then((data) => setTracks(data))
  }, [])

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
      ${album.title} ${album.artist} ${album.tracks.map((t) => t.title).join(' ')}
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

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }

  const handleVolume = (value: number) => {
    setVolume(value)
    if (audioRef.current) audioRef.current.volume = value
  }

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
        <div className="album-grid">{albums.slice(0, 4).map((a) => (
          <AlbumCard key={a.id} album={a}
            onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
            onSelect={() => setSelectedAlbumId(a.id)} />
        ))}</div>
      </section>
      <section>
        <div className="section-title"><h2>Made For You</h2></div>
        <div className="album-grid">{albums.slice(4).map((a) => (
          <AlbumCard key={a.id} album={a}
            onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
            onSelect={() => setSelectedAlbumId(a.id)} />
        ))}</div>
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
        <div className="album-grid">{albums.map((a) => (
          <AlbumCard key={a.id} album={a}
            onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
            onSelect={() => setSelectedAlbumId(a.id)} />
        ))}</div>
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
            <div className="radio-art" style={{ background: linear-gradient(135deg, ${s.color}) }}>
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
      </div>
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
        <div className="album-grid">{albums.slice(0, 4).map((a) => (
          <AlbumCard key={a.id} album={a}
            onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
            onSelect={() => setSelectedAlbumId(a.id)} />
        ))}</div>
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
      </div>
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
          <div className="album-grid">{filteredAlbums.map((a) => (
            <AlbumCard key={a.id} album={a}
              onPlay={() => { setSelectedAlbumId(a.id); if (a.tracks.length) playTrack(a.tracks[0], a.tracks) }}
              onSelect={() => setSelectedAlbumId(a.id)} />
          ))}</div>
          <div className="section-title"><h2>Tracks</h2></div>
          <div className="track-list-compact">
            {filteredTracks.map((t) => (
              <div key={t.id} className="track-row-compact" onClick={() => playTrack(t, tracks)}>
                <div className="mini-cover" style={{ background: t.cover }} />
                <div className="track-meta"><strong>{t.title}</strong><span>{t.artist}</span></div>
                <span className="like-count">❤️ {t.likes}</span>
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

  const renderFullPlayer = () => (
    <div className="full-player-overlay">
      <div className="full-player">
        <div className="full-player-bg" style={{ background: currentTrack?.cover || 'linear-gradient(135deg, #fa2d6c, #fc6f60)' }} />
        <div className="full-player-content">
          <div className="full-player-top">
            <button className="collapse-btn" onClick={() => setMiniPlayerOpen(false)}>▼</button>
            <span className="now-playing-label">NOW PLAYING</span>
            <button className="queue-btn" onClick={() => setMiniPlayerOpen(false)}>☰</button>
          </div>
          <div
            className="full-artwork"
            style={{ background: currentTrack?.cover || 'linear-gradient(135deg, #fa2d6c, #fc6f60)' }}
          >
            <div className="vinyl-shine" />
          </div>
          <div className="full-track-info">
            <h2>{currentTrack?.title || 'No Track Selected'}</h2>
            <p>{currentTrack?.artist || 'Harmony Kus-lords'}</p>
            {currentTrack?.isSportsAnthem && <span className="stadium-badge">⚡ STADIUM ANTHEM</span>}
          </div>
          <div className="full-progress">
            <input type="range" min={0} max={duration || 0} value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))} className="full-range" />
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
            <span>🔊</span
