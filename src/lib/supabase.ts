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
const gradient = (colors: string) => `linear-gradient(135deg, ${colors})`

const fallbackTracks: Track[] = [
  {
    id: 't-sports-1',
    title: 'Champions Arena Anthem',
    artist: 'Royal Kus-Lords Brass',
    album: 'Matchday Stadium Hype',
    duration: 310,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
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
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
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
      id: `uploaded-${Date.now()}`,
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
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `tracks/${fileName}`

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
      const coverName = `${Date.now()}-cover.${coverExt}`
      const coverPath = `covers/${coverName}`
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