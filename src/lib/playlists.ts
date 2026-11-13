import type { Track } from '../data/music'
import { supabase } from './supabase'

export interface MusicPlaylist {
  id: string
  name: string
  description?: string
  coverUrl: string
  trackIds: string[]
  createdBy: string
  isUserPlaylist?: boolean
  updatedAt?: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireUser() {
  if (!supabase) throw new Error('The shared music database is not configured.')
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to manage cloud playlists.')
  return data.user
}

export async function fetchMusicPlaylists(): Promise<MusicPlaylist[]> {
  const user = await requireUser()
  const { data, error } = await supabase!
    .from('music_playlists')
    .select('id,name,description,cover_url,created_at,updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30)
  if (error) throw new Error(`Could not load cloud playlists: ${error.message}`)
  const rows = data || []
  if (!rows.length) return []
  const ids = rows.map((row) => row.id)
  const { data: items, error: itemsError } = await supabase!
    .from('music_playlist_tracks')
    .select('playlist_id,track_post_id,position')
    .in('playlist_id', ids)
    .order('position', { ascending: true })
  if (itemsError) throw new Error(`Could not load playlist tracks: ${itemsError.message}`)
  const trackIds = new Map<string, string[]>()
  for (const item of items || []) {
    const current = trackIds.get(item.playlist_id) || []
    current.push(item.track_post_id)
    trackIds.set(item.playlist_id, current)
  }
  const createdBy = String(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'You')
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    coverUrl: row.cover_url || '',
    trackIds: trackIds.get(row.id) || [],
    createdBy,
    isUserPlaylist: true,
    updatedAt: row.updated_at || row.created_at,
  }))
}

export async function createCloudPlaylist(name: string): Promise<void> {
  const user = await requireUser()
  const cleanName = name.trim().slice(0, 64)
  if (!cleanName) throw new Error('Enter a playlist name.')
  const { count, error: countError } = await supabase!
    .from('music_playlists')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
  if (countError) throw new Error(countError.message)
  if ((count || 0) >= 30) throw new Error('You can create up to 30 playlists.')
  const { error } = await supabase!.from('music_playlists').insert({
    user_id: user.id, name: cleanName, description: '',
  })
  if (error) throw new Error(`Could not create playlist: ${error.message}`)
}

export async function addCloudPlaylistTrack(playlistId: string, track: Track, position: number): Promise<void> {
  if (!UUID.test(track.postId || track.id)) throw new Error('Only published tracks from the shared music library can be added.')
  const { error } = await supabase!.from('music_playlist_tracks').insert({
    playlist_id: playlistId,
    track_post_id: track.postId || track.id,
    position: Math.max(0, position),
  })
  if (error && !/duplicate|unique/i.test(error.message)) throw new Error(`Could not add track: ${error.message}`)
  const { error: updateError } = await supabase!.from('music_playlists')
    .update({ cover_url: track.cover || null, updated_at: new Date().toISOString() })
    .eq('id', playlistId)
  if (updateError) throw new Error(`Track was added, but playlist metadata could not refresh: ${updateError.message}`)
}

export async function removeCloudPlaylistTrack(playlistId: string, trackId: string): Promise<void> {
  const { error } = await supabase!.from('music_playlist_tracks')
    .delete().eq('playlist_id', playlistId).eq('track_post_id', trackId)
  if (error) throw new Error(`Could not remove track: ${error.message}`)
  await supabase!.from('music_playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId)
}

export async function deleteCloudPlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase!.from('music_playlists').delete().eq('id', playlistId)
  if (error) throw new Error(`Could not delete playlist: ${error.message}`)
}
