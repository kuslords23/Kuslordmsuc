import type { Track } from '../data/music'
import { supabase } from './supabase'

export async function hashAudioFile(file: File): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure audio hashing requires HTTPS or a secure browser context.')
  }
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function assertReleaseAvailable(contentHash: string): Promise<void> {
  if (!supabase) throw new Error('The shared Supabase music database is not configured.')
  const { data: registered, error: registryError } = await supabase.rpc(
    'check_music_release_registered',
    { p_content_hash: contentHash },
  )
  if (registryError) {
    throw new Error(`Secure release registry check is unavailable. Verify the Kus-Lords Music schema migration: ${registryError.message}`)
  }
  if (registered === true) throw new Error('This audio file is already registered or attached to a published music post.')
}

export async function registerUploadedRelease(
  contentHash: string,
  track: Track,
  ownerUserId: string,
): Promise<void> {
  if (!supabase || !track.postId) throw new Error('The published track is missing its canonical database record.')
  const { error } = await supabase.from('music_release_registry').insert({
    content_hash: contentHash,
    post_id: track.postId,
    artist_profile_id: track.artistProfileId || null,
    owner_user_id: ownerUserId,
    title: track.title,
  })
  if (error) throw new Error(`Release registration failed: ${error.message}`)
}

export async function rollbackUnregisteredUpload(track: Track, ownerUserId: string): Promise<void> {
  if (!supabase || !track.postId) return
  const { error: postError } = await supabase.from('feed_posts')
    .delete().eq('id', track.postId).eq('user_id', ownerUserId)
  if (postError) console.error('Could not remove unregistered audio post:', postError.message)
  if (track.storagePath) {
    const { error } = await supabase.storage.from('kus-music').remove([track.storagePath])
    if (error) console.error('Could not remove unregistered audio file:', error.message)
  }
  if (track.coverStoragePath) {
    const { error } = await supabase.storage.from('kus-images').remove([track.coverStoragePath])
    if (error) console.error('Could not remove unregistered cover file:', error.message)
  }
}
