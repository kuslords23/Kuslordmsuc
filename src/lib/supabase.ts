import { createClient } from '@supabase/supabase-js'
import type { Track } from '../data/music'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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

const gradient = (colors: string) => `linear-gradient(135deg, ${colors})`

export type LibraryStatus = 'remote' | 'empty' | 'fallback' | 'error'

export interface RemoteLibraryResult {
  tracks: Track[]
  status: LibraryStatus
  message?: string
}

interface DbTrack {
  id: string
  title: string | null
  artist?: string | null
  album?: string | null
  duration?: number | null
  audio_url?: string | null
  cover_url?: string | null
  cover?: string | null
  genre?: string | null
  is_sports_anthem?: boolean | null
  match_vibe?: string | null
  likes?: number | null
  created_at?: string
}

/**
 * Maps a Supabase `music_tracks` row to the frontend Track shape.
 * This keeps database field names (`audio_url`, `cover_url`) isolated
 * from the UI model (`audioUrl`, `cover`).
 */
function rowToTrack(d: DbTrack): Track | null {
  if (!d?.id || !d?.audio_url) return null

  return {
    id: d.id,
    title: d.title || 'Untitled',
    artist: d.artist || 'Unknown Artist',
    album: d.album || 'Single',
    duration: d.duration || 210,
    audioUrl: d.audio_url,
    cover: d.cover_url || d.cover || gradient('#fa2d6c, #fc6f60'),
    genre: d.genre || undefined,
    isSportsAnthem: d.is_sports_anthem ? true : undefined,
    matchVibe: d.match_vibe || undefined,
    likes: d.likes ?? 0,
  }
}

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

/**
 * Fetches the shared SCN `music_tracks` table.
 *
 * Important behavior:
 * - A successful remote fetch returns ONLY remote tracks.
 * - A valid empty table returns `status: 'empty'` and no tracks.
 * - A failed request returns demo tracks with `status: 'error'` so the UI
 *   can show a truthful banner instead of pretending cloud sync succeeded.
 */
export async function fetchRemoteTracks(): Promise<RemoteLibraryResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      tracks: fallbackTracks,
      status: 'fallback',
      message: 'Supabase is not configured.',
    }
  }

  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load remote tracks:', error.message)
      return {
        tracks: fallbackTracks,
        status: 'error',
        message: error.message,
      }
    }

    if (!data || data.length === 0) {
      return { tracks: [], status: 'empty' }
    }

    const fetched: Track[] = data
      .map((d) => rowToTrack(d as DbTrack))
      .filter((t): t is Track => t !== null)

    return { tracks: fetched, status: 'remote' }
  } catch (err: any) {
    console.error('Failed to load remote tracks:', err?.message || err)
    return {
      tracks: fallbackTracks,
      status: 'error',
      message: err?.message || 'Unknown error',
    }
  }
}

/**
 * Deletes a storage object created during a failed upload.
 * This only ever targets objects created by the current operation.
 */
async function removeUploadedFile(bucket: string, path: string) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error(`Failed to clean up ${bucket}/${path}:`, error.message)
  }
}

/**
 * Uploads a track to the shared SCN storage buckets and creates its
 * database record in `music_tracks`.
 *
 * Success is only reported after:
 * 1. Audio exists in `music-audio`.
 * 2. Optional cover exists in `music-covers`.
 * 3. The `music_tracks` row is inserted AND returned with its real DB ID.
 *
 * If the database insert fails, the newly uploaded audio (and cover) are
 * cleaned up so the shared buckets do not accumulate orphan files.
 */
export async function uploadTrackToBucket(params: {
  title: string
  artist: string
  album: string
  audioFile: File
  coverFile: File | null
  user: { id: string }
}): Promise<Track> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured. Uploads require the shared SCN Supabase project.')
  }

  const fileExt = params.audioFile.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(7)}.${fileExt}`
  const audioPath = `tracks/${fileName}`

  let coverPath: string | null = null
  let coverPublicUrl: string | null = null

  const { error: uploadError } = await supabase.storage
    .from('music-audio')
    .upload(audioPath, params.audioFile)

  if (uploadError) {
    throw new Error(`Audio upload failed: ${uploadError.message}`)
  }

  try {
    const { data: audioUrlData } = supabase.storage
      .from('music-audio')
      .getPublicUrl(audioPath)
    const audioPublicUrl = audioUrlData.publicUrl

    // Optional cover upload. If it fails, continue without it but surface a warning.
    if (params.coverFile) {
      const coverExt = params.coverFile.name.split('.').pop()
      coverPath = `covers/${Date.now()}-cover.${coverExt}`

      const { error: coverErr } = await supabase.storage
        .from('music-covers')
        .upload(coverPath, params.coverFile)

      if (coverErr) {
        console.warn('Cover upload failed; continuing without a cover image.', coverErr.message)
        coverPath = null
      } else {
        const { data: coverUrlData } = supabase.storage
          .from('music-covers')
          .getPublicUrl(coverPath)
        coverPublicUrl = coverUrlData.publicUrl
      }
    }

    const { data: inserted, error: dbError } = await supabase
      .from('music_tracks')
      .insert({
        title: params.title,
        artist: params.artist,
        album: params.album,
        audio_url: audioPublicUrl,
        cover_url: coverPublicUrl || '',
        duration: 240,
        user_id: params.user.id,
      })
      .select('*')
      .single()

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`)
    }

    const track = rowToTrack(inserted as DbTrack)
    if (!track) {
      throw new Error('Track was saved but the database returned an invalid record.')
    }

    return track
  } catch (err) {
    // Only remove files created by this failed operation.
    await removeUploadedFile('music-audio', audioPath)
    if (coverPath) {
      await removeUploadedFile('music-covers', coverPath)
    }
    throw err
  }
}

/**
 * Subscribes to realtime changes on the shared `music_tracks` table.
 * Requires Realtime to be enabled on that table in Supabase:
 *
 *   alter publication supabase_realtime add table music_tracks;
 */
export function subscribeToTrackChanges(
  onInsert: (track: Track) => void,
  onUpdate: (track: Track) => void,
  onDelete: (trackId: string) => void,
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {}
  }

  const channel = supabase.channel('music-tracks-realtime')

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'music_tracks' },
      (payload) => {
        const track = rowToTrack((payload.new || {}) as DbTrack)
        if (track) onInsert(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'music_tracks' },
      (payload) => {
        const track = rowToTrack((payload.new || {}) as DbTrack)
        if (track) onUpdate(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'music_tracks' },
      (payload) => {
        const oldRow = (payload.old || {}) as DbTrack
        if (oldRow?.id) onDelete(oldRow.id)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}