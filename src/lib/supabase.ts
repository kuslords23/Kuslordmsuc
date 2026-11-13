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
  post_type?: string | null
  sound_title?: string | null
  sound_artist?: string | null
  artist_profile_id?: string | null
  audio_content_hash?: string | null
  listen_count?: number | null
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
  if (post.sound_title && post.sound_title.trim()) return post.sound_title.trim()
  if (post.title && post.title.trim()) return post.title.trim()
  if (post.caption && post.caption.trim()) return post.caption.trim()
  if (post.content && post.content.trim()) {
    const content = post.content.trim()
    // Older uploads stored a combined "title — artist (album)" display string.
    return content.split(/\s+[—-]\s+/)[0]?.trim() || content
  }

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
    postId: d.id,
    userId: d.user_id || undefined,
    artistProfileId: d.artist_profile_id || undefined,
    audioContentHash: d.audio_content_hash || undefined,
    title,
    artist: d.sound_artist?.trim() || 'Kus-lords Artist',
    album: 'Cloud Vault',
    duration: 0, // Duration is not part of the verified feed_posts audio contract yet.
    audioUrl,
    cover,
    likes: 0,
  }
}

/**
 * Fetches audio tracks from the existing feed_posts table.
 *
 * Returns:
 * - remote  : tracks from feed_posts (media_url or storage_path present)
 * - empty   : feed_posts has no audio records
 * - error   : the query failed (network, RLS, or missing table)
 * - fallback: Supabase is not configured at all
 *
 * No synthetic tracks are returned for empty, unavailable, or failed data sources.
 */
export async function fetchRemoteTracks(): Promise<RemoteLibraryResult> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      tracks: [],
      status: 'fallback',
      message: 'Supabase is not configured. Configure the shared music project to load live audio.',
    }
  }

  try {
    // Query feed_posts which is the authoritative audio table.
    // The table has public read access (RLS allows SELECT for everyone).
    const { data, error } = await supabase
      .from('feed_posts')
      .select('*')
      .eq('post_type', 'audio')
      .or('media_url.not.is.null,storage_path.not.is.null')
      .order('created_at', { ascending: false })

    if (error) {
      // This covers missing table, column errors, RLS, etc.
      console.error('feed_posts query failed:', error.message)
      return {
        tracks: [],
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
      tracks: [],
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
export interface MusicArtistProfileOption {
  id: string
  name: string
}

export interface PublicMusicArtistProfile extends MusicArtistProfileOption {
  userId: string
  bio: string
  avatar: string
  verified: boolean
  followerCount: number
  tagline?: string
  vision?: string
  genreFocus?: string
  ctaLabel?: string
  ctaUrl?: string
  heroImageUrl?: string
  pressKitUrl?: string
  bookingEmail?: string
  socials: Record<string, string>
  credits: Array<{ title: string; role: string; artist?: string; url?: string }>
}

export type MusicArtistProfileInput = {
  name: string
  bio?: string
  avatar?: string
  tagline?: string
  vision?: string
  genre_focus?: string
  cta_label?: string
  cta_url?: string
  hero_image_url?: string
  press_kit_url?: string
  booking_email?: string
  socials?: Record<string, string>
  credits?: Array<{ title: string; role: string; artist?: string; url?: string }>
}

/** Creates or updates only the currently authenticated user's artist profile. */
export async function saveArtistProfile(
  profileId: string | null,
  input: MusicArtistProfileInput,
): Promise<{ id: string | null; error: string | null }> {
  if (!supabase) return { id: null, error: 'Supabase is not configured.' }
  const name = input.name.trim().slice(0, 80)
  if (!name) return { id: null, error: 'Artist name is required.' }
  const { data: authData, error: authError } = await supabase.auth.getSession()
  const session = authData.session
  if (authError || !session) return { id: null, error: 'Sign in to manage an artist profile.' }

  const values = {
    ...input,
    name,
    bio: (input.bio || '').slice(0, 2000),
    user_id: session.user.id,
  }
  const result = profileId
    ? await supabase.from('artist_profiles').update(values).eq('id', profileId).eq('user_id', session.user.id).select('id').maybeSingle()
    : await supabase.from('artist_profiles').insert(values).select('id').single()
  if (result.error) return { id: null, error: result.error.message }
  if (!result.data?.id) return { id: null, error: 'Artist profile was not found or could not be saved.' }
  return { id: String(result.data.id), error: null }
}

/** Public artist directory backed by the SCN artist_profiles table and its RLS read policy. */
export async function fetchPublicArtistProfiles(): Promise<PublicMusicArtistProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id,name,user_id,bio,avatar,verified,follower_count,tagline,vision,genre_focus,cta_label,cta_url,hero_image_url,press_kit_url,booking_email,socials,credits')
    .order('follower_count', { ascending: false })
    .limit(60)
  if (error) {
    console.warn('Could not load public artist directory:', error.message)
    return []
  }
  return (data || []).map((row) => ({
    id: String(row.id),
    name: String(row.name || 'Unknown artist'),
    userId: String(row.user_id || ''),
    bio: String(row.bio || ''),
    avatar: String(row.avatar || '🎤'),
    verified: Boolean(row.verified),
    followerCount: Number(row.follower_count || 0),
    tagline: typeof row.tagline === 'string' ? row.tagline : undefined,
    vision: typeof row.vision === 'string' ? row.vision : undefined,
    genreFocus: typeof row.genre_focus === 'string' ? row.genre_focus : undefined,
    ctaLabel: typeof row.cta_label === 'string' ? row.cta_label : undefined,
    ctaUrl: typeof row.cta_url === 'string' ? row.cta_url : undefined,
    heroImageUrl: typeof row.hero_image_url === 'string' ? row.hero_image_url : undefined,
    pressKitUrl: typeof row.press_kit_url === 'string' ? row.press_kit_url : undefined,
    bookingEmail: typeof row.booking_email === 'string' ? row.booking_email : undefined,
    socials: row.socials && typeof row.socials === 'object' && !Array.isArray(row.socials)
      ? row.socials as Record<string, string>
      : {},
    credits: Array.isArray(row.credits) ? row.credits as Array<{ title: string; role: string; artist?: string; url?: string }> : [],
  }))
}

/** Lists the signed-in creator's own artist profiles using the active RLS session. */
export async function fetchOwnedArtistProfiles(userId: string): Promise<MusicArtistProfileOption[]> {
  if (!userId || !supabase) return []
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) {
    console.warn('Could not load artist profiles:', error.message)
    return []
  }
  return (data || []).filter((item): item is MusicArtistProfileOption =>
    typeof item.id === 'string' && typeof item.name === 'string'
  )
}

export async function uploadTrackToBucket(params: {
  title: string
  artist: string
  album: string
  audioFile: File
  coverFile: File | null
  user: { id: string }
  artistProfileId?: string | null
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
        post_type: 'audio',
        content,
        sound_title: params.title.trim(),
        sound_artist: params.artist.trim(),
        media_url: audioPublicUrl,
        storage_path: audioPath,
        cover_storage_path: coverPath || null,
        artist_profile_id: params.artistProfileId || null,
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