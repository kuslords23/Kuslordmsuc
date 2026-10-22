import { createClient } from '@supabase/supabase-js'
import type { Track } from '../data/music'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const AUTH_STORAGE_KEY = 'kus-lords-auth'

export const isSupabaseConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// The root URL for constructing public storage URLs
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public`

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

// ---------------------------------------------------------------------------
//  Row → Track mapper for the SCN `feed_posts` table
//
//  Actual columns discovered in the project dsbkwqywuettzlzbtqef:
//    - id, user_id, caption, media_url, storage_path, cover_storage_path,
//      created_at, type, other metadata
//
//  `storage_path` is the path inside the `kus-music` bucket (e.g. "audio/xyz.mp3")
//  `cover_storage_path` is a path inside `kus-images` (e.g. "covers/abc.jpg")
//
//  When `media_url` is already a full URL we use it directly; otherwise we
//  construct it from the storage path.
// ---------------------------------------------------------------------------
interface FeedPostRow {
  id: string
  caption?: string | null
  media_url?: string | null
  storage_path?: string | null
  cover_storage_path?: string | null
  type?: string | null
  artist?: string | null          // not guaranteed; may be absent
  album?: string | null
  duration?: number | null
  genre?: string | null
  likes?: number | null
  user_id?: string
}

function rowToTrack(d: FeedPostRow): Track | null {
  // We require either a valid media_url or a storage_path to construct one
  const audioUrl =
    d.media_url && (d.media_url.startsWith('http://') || d.media_url.startsWith('https://'))
      ? d.media_url
      : d.storage_path
        ? `${STORAGE_URL}/kus-music/${d.storage_path.replace(/^\/?/, '')}`
        : null

  if (!d?.id || !audioUrl) return null

  // Construct cover URL from cover_storage_path if present
  const coverUrl = d.cover_storage_path
    ? `${STORAGE_URL}/kus-images/${d.cover_storage_path.replace(/^\/?/, '')}`
    : null

  return {
    id: d.id,
    title: d.caption || 'Untitled',
    artist: d.artist || 'SCN Artist',
    album: d.album || 'SCN Feed',
    duration: d.duration || 180,
    audioUrl,
    cover: coverUrl || gradient('#fa2d6c, #fc6f60'),
    genre: d.genre || undefined,
    isSportsAnthem: d.genre === 'Stadium Anthem' ? true : undefined,
    likes: d.likes ?? 0,
  }
}

// ---------------------------------------------------------------------------
//  Fallback tracks – displayed only when Supabase is not configured or when
//  the real request fails.  Never mixed with real data.
// ---------------------------------------------------------------------------
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
  // … (full array unchanged, omitted for brevity – same as before)
  // …
]

// ---------------------------------------------------------------------------
//  Fetch music from the shared SCN `feed_posts` table
// ---------------------------------------------------------------------------
export async function fetchRemoteTracks(): Promise<RemoteLibraryResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      tracks: fallbackTracks,
      status: 'fallback',
      message: 'Supabase is not configured.',
    }
  }

  try {
    // Query the SCN feed_posts table – all columns, ordered by creation date.
    // If a `type` column exists and distinguishes audio posts, we could add
    //   .eq('type', 'audio')
    // but we use a fallback: we filter later for entries that have audio.
    const { data, error } = await supabase
      .from('feed_posts')
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
      .map((d) => rowToTrack(d as FeedPostRow))
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

// ---------------------------------------------------------------------------
//  Clean up uploaded files on failure – scoped to the current operation only
// ---------------------------------------------------------------------------
async function removeUploadedFile(bucket: string, path: string) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error(`Failed to clean up ${bucket}/${path}:`, error.message)
  }
}

// ---------------------------------------------------------------------------
//  Upload a track to the shared SCN infrastructure
//
//  1. Audio file   → `kus-music` bucket
//  2. Cover file   → `kus-images` bucket (optional)
//  3. Metadata     → `feed_posts` table
// ---------------------------------------------------------------------------
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
  const audioPath = `audio/${fileName}`

  let coverPath: string | null = null
  let coverStoragePath: string | null = null

  // 1. Upload audio to `kus-music`
  const { error: uploadErr } = await supabase.storage
    .from('kus-music')
    .upload(audioPath, params.audioFile)

  if (uploadErr) {
    throw new Error(`Audio upload failed: ${uploadErr.message}`)
  }

  try {
    // 2. (Optional) Upload cover to `kus-images`
    if (params.coverFile) {
      const coverExt = params.coverFile.name.split('.').pop()
      coverStoragePath = `covers/${Date.now()}-cover.${coverExt}`

      const { error: coverErr } = await supabase.storage
        .from('kus-images')
        .upload(coverStoragePath, params.coverFile)

      if (coverErr) {
        console.warn('Cover upload failed; continuing without a cover image.', coverErr.message)
        coverStoragePath = null
      } else {
        coverPath = `${STORAGE_URL}/kus-images/${coverStoragePath.replace(/^\/?/, '')}`
      }
    }

    // 3. Insert metadata into `feed_posts`
    //    We do NOT provide a hardcoded `type` column because the existing
    //    feed_posts schema varies. We store the audio path and cover path so
    //    the frontend can reconstruct the URLs reliably.
    const { data: inserted, error: dbError } = await supabase
      .from('feed_posts')
      .insert({
        user_id: params.user.id,
        caption: params.title,
        media_url: `${STORAGE_URL}/kus-music/${audioPath.replace(/^\/?/, '')}`,
        storage_path: audioPath,
        cover_storage_path: coverStoragePath,
        type: 'audio',
      })
      .select('*')
      .single()

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`)
    }

    const track = rowToTrack(inserted as FeedPostRow)
    if (!track) {
      throw new Error('Track was saved but the database returned an invalid record.')
    }

    return track
  } catch (err) {
    // Clean up only the files created by this operation
    await removeUploadedFile('kus-music', audioPath)
    if (coverStoragePath) {
      await removeUploadedFile('kus-images', coverStoragePath)
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
//  Realtime subscription on the shared `feed_posts` table
//
//  Requires Realtime to be enabled on `feed_posts`:
//    alter publication supabase_realtime add table feed_posts;
// ---------------------------------------------------------------------------
export function subscribeToTrackChanges(
  onInsert: (track: Track) => void,
  onUpdate: (track: Track) => void,
  onDelete: (trackId: string) => void,
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {}
  }

  const channel = supabase.channel('feed-posts-realtime')

  channel
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feed_posts' },
      (payload) => {
        const track = rowToTrack((payload.new || {}) as FeedPostRow)
        if (track) onInsert(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
      (payload) => {
        const track = rowToTrack((payload.new || {}) as FeedPostRow)
        if (track) onUpdate(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'feed_posts' },
      (payload) => {
        const oldRow = (payload.old || {}) as FeedPostRow
        if (oldRow?.id) onDelete(oldRow.id)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}