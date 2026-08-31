import { createClient, User } from '@supabase/supabase-js'
import { Track, albums as fallbackAlbums, allTracks as fallbackTracks } from '../data/music'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kuslords-mock.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'mock-anon-key'

export const AUTH_STORAGE_KEY = 'kus-lords-auth'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: AUTH_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export interface DbTrack {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  audio_url: string
  cover_url?: string
  user_id?: string
  created_at?: string
}

export const isSupabaseConfigured = () => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('mock.supabase.co')
  )
}

export async function fetchRemoteTracks(): Promise<Track[]> {
  if (!isSupabaseConfigured()) {
    return fallbackTracks
  }

  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return fallbackTracks
    }

    const fetched: Track[] = data.map((d: DbTrack) => ({
      id: d.id,
      title: d.title,
      artist: d.artist || 'Unknown Artist',
      album: d.album || 'Single',
      duration: d.duration || 210,
      audioUrl: d.audio_url,
      cover: d.cover_url || 'linear-gradient(135deg, #fa2d6c, #fc6f60)',
    }))

    return [...fetched, ...fallbackTracks]
  } catch {
    return fallbackTracks
  }
}

export async function uploadTrackToBucket(params: {
  title: string
  artist: string
  album: string
  audioFile: File
  coverFile?: File | null
  user: User
}): Promise<Track | null> {
  const { title, artist, album, audioFile, coverFile, user } = params
  const fileExt = audioFile.name.split('.').pop()
  const audioFileName = `${user.id}/${Date.now()}-audio.${fileExt}`

  if (!isSupabaseConfigured()) {
    // Local fallback creation
    const newTrack: Track = {
      id: `local-${Date.now()}`,
      title,
      artist,
      album: album || 'Single',
      duration: 240,
      audioUrl: URL.createObjectURL(audioFile),
      cover: coverFile ? URL.createObjectURL(coverFile) : 'linear-gradient(135deg, #f857a6, #ff5858)',
    }
    return newTrack
  }

  // 1. Upload audio to storage bucket 'music' or 'audio'
  const { error: audioUploadError } = await supabase.storage
    .from('music')
    .upload(audioFileName, audioFile, { upsert: true })

  if (audioUploadError) {
    throw new Error(`Audio upload failed: ${audioUploadError.message}`)
  }

  const { data: audioUrlData } = supabase.storage.from('music').getPublicUrl(audioFileName)
  let coverUrl = 'linear-gradient(135deg, #fa2d6c, #fc6f60)'

  if (coverFile) {
    const coverExt = coverFile.name.split('.').pop()
    const coverFileName = `${user.id}/${Date.now()}-cover.${coverExt}`
    const { error: coverUploadError } = await supabase.storage
      .from('covers')
      .upload(coverFileName, coverFile, { upsert: true })

    if (!coverUploadError) {
      const { data: coverUrlData } = supabase.storage.from('covers').getPublicUrl(coverFileName)
      coverUrl = coverUrlData.publicUrl
    }
  }

  // 2. Insert record into database
  const { data, error } = await supabase
    .from('music_tracks')
    .insert([
      {
        title,
        artist,
        album: album || 'Singles',
        audio_url: audioUrlData.publicUrl,
        cover_url: coverUrl,
        user_id: user.id,
        duration: 240,
      },
    ])
    .select()
    .single()

  if (error || !data) {
    return {
      id: `track-${Date.now()}`,
      title,
      artist,
      album,
      duration: 240,
      audioUrl: audioUrlData.publicUrl,
      cover: coverUrl,
    }
  }

  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    album: data.album,
    duration: data.duration || 240,
    audioUrl: data.audio_url,
    cover: data.cover_url || coverUrl,
  }
}