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

/**
 * The Supabase project (dsbkwqywuettzlzbtqef) uses feed_posts for audio
 * content and kus-music / kus-images for storage. The expected
 * music_tracks table and music-audio / music-covers buckets do not
 * exist. This adapter maps the existing schema to the frontend Track
 * type.
 */

interface DbFeedPost {
  id: string
  media_url?: string | null
  storage_path?: string | null
  cover_storage_path?: string | null
  content?: string | null
  caption?: string | null
  title?: string | null
  user_id?: string | null
  created_at?: string
}

/**
 * Constructs a public URL for a storage object without
 * assuming the object exists. Returns empty string if
 * the path is missing or invalid.
 */
function bucketPublicUrl(bucket: string, path: string | null | undefined): string {
  if (!path || !supabase) return ''
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl || ''
  } catch {
    return ''
  }
}

/**
 * Derives a display title from a feed post.
 * Uses content/caption, then the filename part of storage_path,
 * then a default.
 */
function deriveTitle(post: DbFeedPost): string {
  // Try common text fields first
  if (post.content && post.content.trim()) return post.content.trim()
  if (post.caption && post.caption.trim()) return post.caption.trim()
  if (post.title && post.title.trim()) return post.title.trim()

  // Fall back to the filename in storage_path
  if (post.storage_path) {
    const parts = post.storage_path.split('/')
    const file = parts.pop() || ''
    const name = file.replace(/\.[^/.]+$/, '') // strip extension
    if (name) return name.replace(/[-_]/g, ' ')
  }

  return 'Untitled Track'
}

/**
 * Maps a feed_posts row to a Track.
 * feed_posts has: id, media_url, storage_path, cover_storage_path,
 * user_id, created_at, and optionally content/caption/title.
 * The kus-music bucket holds audio objects, kus-images holds covers.
 */
function rowToTrack(d: DbFeedPost): Track | null {
  if (!d?.id) return null

  // media_url is already a public URL; if missing, construct from storage_path
  let audioUrl = d.media_url || ''
  if (!audioUrl && d.storage_path && supabase) {
    audioUrl = bucketPublicUrl('kus-music', d.storage_path)
  }
  if (!audioUrl) return null

  // Cover image
  let cover = ''
  if (d.cover_storage_path) {
    cover = bucketPublicUrl('kus-images', d.cover_storage_path)
  }
  if (!cover) {
    cover = gradient('#fa2d6c, #fc6f60') // default gradient
  }

  const title = deriveTitle(d)

  return {
    id: d.id,
    title,
    artist: 'Kus-lords Artist', // stored in user_media; default when unavailable
    album: 'Cloud Vault',
    duration: 0, // not stored in feed_posts; could be read from user_media
    audioUrl,
    cover,
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
 * Fetches audio tracks from the existing feed_posts table.
 *
 * Returns:
 * - remote  : tracks from feed_posts (media_url or storage_path present)
 * - empty   : feed_posts has no audio records
 * - error   : the query failed (network, RLS, or missing table)
 * - fallback: Supabase is not configured at all
 *
 * Demo tracks are ONLY returned on error or fallback — never on success.
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
    // Query feed_posts which is the authoritative audio table.
    // The table has public read access (RLS allows SELECT for everyone).
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .not('media_url', 'is', null)          // only rows with audio
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      // This covers missing table, column errors, RLS, etc.
      console.error('feed_posts query failed:', error.message)
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
      .map((d) => rowToTrack(d as DbFeedPost))
      .filter((t): t is Track => t !== null)

    if (fetched.length === 0) {
      // All rows were missing usable URLs — treat as empty
      return { tracks: [], status: 'empty', message: 'No playable audio found in feed_posts.' }
    }

    return { tracks: fetched, status: 'remote' }
  } catch (err: any) {
    console.error('fetchRemoteTracks failed:', err?.message || err)
    return {
      tracks: fallbackTracks,
      status: 'error',
      message: err?.message || 'Unknown error',
    }
  }
}

/**
 * Removes a storage object that was created by a failed upload.
 * Never deletes objects outside the current operation.
 */
async function removeUploadedFile(bucket: string, path: string) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) {
    console.error(`Failed to clean up ${bucket}/${path}:`, error.message)
  }
}

/**
 * Uploads a track to the existing kus-music / kus-images buckets and
 * inserts the record into feed_posts.
 *
 * Uses the existing SCN storage infrastructure:
 *   - Audio → kus-music bucket
 *   - Cover → kus-images bucket (optional)
 *   - Metadata → feed_posts table
 *
 * On database failure, cleans up newly created storage objects.
 * Does not create new tables or buckets.
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
    throw new Error(
      'Supabase is not configured. Uploads require the existing project at ' +
      SUPABASE_URL,
    )
  }

  const fileExt = params.audioFile.name.split('.').pop()
  const safeName = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '')
  const fileName = `${Date.now()}-${safeName || 'track'}.${fileExt}`
  const audioPath = fileName

  let coverPath: string | null = null
  let coverPublicUrl: string | null = null

  // 1. Upload audio to kus-music
  const { error: uploadError } = await supabase.storage
    .from('kus-music')
    .upload(audioPath, params.audioFile)

  if (uploadError) {
    throw new Error(`Audio upload to kus-music failed: ${uploadError.message}`)
  }

  try {
    const audioPublicUrl = bucketPublicUrl('kus-music', audioPath)
    if (!audioPublicUrl) {
      throw new Error('Audio uploaded but public URL could not be constructed.')
    }

    // 2. Upload cover to kus-images (optional, non-fatal if it fails)
    if (params.coverFile) {
      const coverExt = params.coverFile.name.split('.').pop()
      coverPath = `cover-${Date.now()}.${coverExt}`

      const { error: coverErr } = await supabase.storage
        .from('kus-images')
        .upload(coverPath, params.coverFile)

      if (coverErr) {
        console.warn(
          'Cover upload to kus-images failed; continuing without cover.',
          coverErr.message,
        )
        coverPath = null
      } else {
        coverPublicUrl = bucketPublicUrl('kus-images', coverPath)
      }
    }

    // 3. Insert metadata into feed_posts
    //    feed_posts has RLS — the authenticated user must own the row.
    //    We store the display title in content, and the storage paths
    //    so the file can be served through kus-music / kus-images.
    const content = `${params.title} — ${params.artist} (${params.album})`

    const { data: inserted, error: dbError } = await supabase
      .from('feed_posts')
      .insert({
        content,
        media_url: audioPublicUrl,
        storage_path: audioPath,
        cover_storage_path: coverPath || null,
        user_id: params.user.id,
      })
      .select('*')
      .single()

    if (dbError) {
      throw new Error(`Database insert into feed_posts failed: ${dbError.message}`)
    }

    const track = rowToTrack(inserted as DbFeedPost)
    if (!track) {
      throw new Error('Track saved to feed_posts but could not be mapped to Track type.')
    }

    return track
  } catch (err) {
    // Cleanup: remove objects created by this operation
    await removeUploadedFile('kus-music', audioPath)
    if (coverPath) {
      await removeUploadedFile('kus-images', coverPath)
    }
    throw err
  }
}

/**
 * Subscribes to realtime changes on the existing feed_posts table.
 *
 * Requires Realtime to be enabled on feed_posts in Supabase:
 *   alter publication supabase_realtime add table feed_posts;
 */
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
        const track = rowToTrack((payload.new || {}) as DbFeedPost)
        if (track) onInsert(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'feed_posts' },
      (payload) => {
        const track = rowToTrack((payload.new || {}) as DbFeedPost)
        if (track) onUpdate(track)
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'feed_posts' },
      (payload) => {
        const oldRow = (payload.old || {}) as DbFeedPost
        if (oldRow?.id) onDelete(oldRow.id)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}