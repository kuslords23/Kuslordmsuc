import type { Track } from '../data/music'
import { supabase } from './supabase'

export type MusicReleaseMetadata = {
  title: string
  artist: string
  album: string
  genre: string
  mood: string
  productionCredits: string
  lyrics: string
  monetizationEnabled: boolean
  isPaidSound: boolean
  paidSoundPriceGhs?: number
  paidSoundDescription?: string
  artistProfileId?: string | null
  audioContentHash: string
}

type UploadProgress = (stage: 'preparing' | 'audio' | 'artwork' | 'publishing' | 'complete') => void

function safeExtension(name: string, fallback: string): string {
  const ext = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  return ext && ext.length <= 8 ? ext : fallback
}

const AUDIO_MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/x-m4a', wav: 'audio/wav',
  aac: 'audio/aac', ogg: 'audio/ogg', flac: 'audio/flac',
}
const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
  'audio/ogg': 'ogg', 'audio/aac': 'aac', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/flac': 'flac',
}
const ALLOWED_AUDIO_MIME = ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/ogg','audio/webm','audio/aac','audio/mp4','audio/x-m4a','audio/m4a','audio/flac']
const ALLOWED_IMAGE_MIME = ['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic']

function publicUrl(bucket: string, path: string): string {
  if (!supabase) return ''
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl || ''
}

/**
 * Publishes an audio post using the shared SCN storage contract.
 * Storage policies require the first object path segment to equal auth.uid().
 */
export async function uploadMusicRelease(
  metadata: MusicReleaseMetadata,
  audioFile: File,
  coverFile: File | null,
  onStage?: UploadProgress,
): Promise<Track> {
  if (!supabase) throw new Error('The shared Supabase music service is not configured.')

  onStage?.('preparing')
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const user = authData.user
  if (authError || !user) throw new Error('Sign in again before publishing this release.')
  if (!metadata.title.trim()) throw new Error('Track title is required.')
  if (!metadata.audioContentHash || metadata.audioContentHash.length !== 64) {
    throw new Error('A secure SHA-256 audio fingerprint is required.')
  }
  if (metadata.isPaidSound && (!metadata.paidSoundPriceGhs || metadata.paidSoundPriceGhs <= 0)) {
    throw new Error('Enter a paid-sound price greater than zero.')
  }

  let artistProfileId: string | null = null
  let artistName = metadata.artist.trim()
  if (metadata.artistProfileId) {
    const { data: profile, error } = await supabase
      .from('artist_profiles')
      .select('id,name')
      .eq('id', metadata.artistProfileId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw new Error(`Could not verify artist profile ownership: ${error.message}`)
    if (!profile) throw new Error('The selected artist profile does not belong to your account.')
    artistProfileId = String(profile.id)
    artistName = String(profile.name)
  }
  if (!artistName) throw new Error('Add an artist name or create an artist profile before publishing.')

  const audioExt = safeExtension(audioFile.name, AUDIO_EXTENSION_BY_MIME[audioFile.type] || 'mp3')
  if (!['mp3','m4a','wav','aac','ogg','flac'].includes(audioExt)) throw new Error('Unsupported audio format. Use MP3, M4A, WAV, AAC, OGG or FLAC.')
  if (audioFile.size > 100 * 1024 * 1024) throw new Error('Audio files must be 100 MB or smaller.')
  const audioMime = audioFile.type || AUDIO_MIME_BY_EXTENSION[audioExt]
  if (!ALLOWED_AUDIO_MIME.includes(audioMime)) throw new Error('This audio format is not accepted by the shared music storage.')
  let coverMime = ''
  if (coverFile) {
    if (coverFile.size > 50 * 1024 * 1024) throw new Error('Cover artwork must be 50 MB or smaller.')
    const coverExt = safeExtension(coverFile.name, ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/heic': 'heic' } as Record<string, string>)[coverFile.type] || 'jpg')
    const fallbackCoverMime = ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', heic: 'image/heic' } as Record<string, string>)[coverExt]
    coverMime = coverFile.type || fallbackCoverMime || ''
    if (!ALLOWED_IMAGE_MIME.includes(coverMime)) throw new Error('Cover artwork must be JPG, PNG, WebP, GIF, AVIF or HEIC.')
  }
  const audioPath = `${user.id}/${crypto.randomUUID()}.${audioExt}`
  let coverPath: string | null = null
  let audioUploaded = false

  try {
    onStage?.('audio')
    const { error: audioError } = await supabase.storage.from('kus-music').upload(audioPath, audioFile, {
      contentType: audioMime,
      upsert: false,
    })
    if (audioError) throw new Error(`Audio upload failed: ${audioError.message}`)
    audioUploaded = true

    let coverUrl = ''
    if (coverFile) {
      onStage?.('artwork')
      const coverExt = safeExtension(coverFile.name, 'jpg')
      coverPath = `${user.id}/${crypto.randomUUID()}.${coverExt}`
      const { error: coverError } = await supabase.storage.from('kus-images').upload(coverPath, coverFile, {
        contentType: coverMime,
        upsert: false,
      })
      if (coverError) throw new Error(`Cover artwork upload failed: ${coverError.message}`)
      coverUrl = publicUrl('kus-images', coverPath)
    }

    onStage?.('publishing')
    const audioUrl = publicUrl('kus-music', audioPath)
    if (!audioUrl) throw new Error('Audio was uploaded but its public URL could not be created.')

    const content = [metadata.title.trim(), artistName, metadata.album.trim()].filter(Boolean).join(' · ')
    const { data: inserted, error: insertError } = await supabase
      .from('feed_posts')
      .insert({
        post_type: 'audio',
        user_id: user.id,
        user_name: String(user.user_metadata?.full_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Artist'),
        user_avatar: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
        title: metadata.title.trim(),
        content,
        sound_title: metadata.title.trim(),
        sound_artist: artistName,
        media_url: audioUrl,
        media_mime: audioFile.type || null,
        storage_path: audioPath,
        cover_url: coverUrl || null,
        cover_storage_path: coverPath,
        artist_profile_id: artistProfileId,
        audio_content_hash: metadata.audioContentHash,
        album_title: metadata.album.trim() || 'Singles',
        genre: metadata.genre.trim() || null,
        mood: metadata.mood.trim() || null,
        production_credits: metadata.productionCredits.trim() || null,
        lyrics: metadata.lyrics.trim() || null,
        monetization_enabled: metadata.monetizationEnabled,
        is_paid_sound: metadata.isPaidSound,
        paid_sound_price_ghs: metadata.isPaidSound ? metadata.paidSoundPriceGhs : null,
        paid_sound_description: metadata.isPaidSound ? metadata.paidSoundDescription?.trim() || null : null,
      })
      .select('id,user_id,artist_profile_id,title,sound_title,sound_artist,album_title,genre,mood,production_credits,lyrics,monetization_enabled,is_paid_sound,paid_sound_price_ghs,paid_sound_description,media_url,storage_path,cover_url,cover_storage_path,audio_content_hash,likes')
      .single()

    if (insertError) throw new Error(`Could not publish the audio record: ${insertError.message}`)
    if (!inserted?.id) throw new Error('The audio record was not returned after publishing.')

    onStage?.('complete')
    return {
      id: String(inserted.id),
      postId: String(inserted.id),
      userId: String(inserted.user_id || user.id),
      artistProfileId: inserted.artist_profile_id ? String(inserted.artist_profile_id) : undefined,
      audioContentHash: String(inserted.audio_content_hash || metadata.audioContentHash),
      storagePath: String(inserted.storage_path || audioPath),
      coverStoragePath: inserted.cover_storage_path ? String(inserted.cover_storage_path) : undefined,
      title: String(inserted.title || inserted.sound_title || metadata.title),
      artist: String(inserted.sound_artist || artistName),
      album: String(inserted.album_title || metadata.album || 'Singles'),
      duration: 0,
      audioUrl: String(inserted.media_url || audioUrl),
      cover: String(inserted.cover_url || coverUrl || ''),
      genre: typeof inserted.genre === 'string' ? inserted.genre : undefined,
      mood: typeof inserted.mood === 'string' ? inserted.mood : undefined,
      productionCredits: typeof inserted.production_credits === 'string' ? inserted.production_credits : undefined,
      lyrics: typeof inserted.lyrics === 'string' ? inserted.lyrics : undefined,
      monetizationEnabled: Boolean(inserted.monetization_enabled),
      isPaidSound: Boolean(inserted.is_paid_sound),
      paidSoundPriceGhs: inserted.paid_sound_price_ghs == null ? undefined : Number(inserted.paid_sound_price_ghs),
      paidSoundDescription: typeof inserted.paid_sound_description === 'string' ? inserted.paid_sound_description : undefined,
    }
  } catch (error) {
    if (audioUploaded) {
      const { error: cleanupError } = await supabase.storage.from('kus-music').remove([audioPath])
      if (cleanupError) console.error('Audio cleanup after failed publish:', cleanupError.message)
    }
    if (coverPath) {
      const { error: cleanupError } = await supabase.storage.from('kus-images').remove([coverPath])
      if (cleanupError) console.error('Artwork cleanup after failed publish:', cleanupError.message)
    }
    throw error
  }
}
