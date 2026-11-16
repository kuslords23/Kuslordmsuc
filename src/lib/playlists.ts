import type { Track } from '../data/music'
import { supabase } from './supabase'

export interface MusicPlaylist {
  id: string
  name: string
  description?: string
  coverUrl: string
  visibility: 'private' | 'public' | 'unlisted'
  isCollaborative: boolean
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
  const [ownedResult, collaborationResult] = await Promise.all([
    supabase!.from('music_playlists').select('id,user_id,name,description,cover_url,visibility,is_collaborative,created_at,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
    supabase!.from('music_playlist_collaborators').select('playlist_id').eq('user_id', user.id).eq('status', 'accepted'),
  ])
  if (ownedResult.error) throw new Error(`Could not load cloud playlists: ${ownedResult.error.message}`)
  if (collaborationResult.error) throw new Error(`Could not load shared playlists: ${collaborationResult.error.message}`)
  const sharedIds = (collaborationResult.data || []).map(row => row.playlist_id)
  const ownRows = ownedResult.data || []
  const sharedResult = sharedIds.length
    ? await supabase!.from('music_playlists').select('id,user_id,name,description,cover_url,visibility,is_collaborative,created_at,updated_at').in('id', sharedIds)
    : { data: [], error: null }
  if (sharedResult.error) throw new Error(`Could not load shared playlists: ${sharedResult.error.message}`)
  const rows = [...ownRows, ...(sharedResult.data || []).filter(row => !ownRows.some(own => own.id === row.id))]
  if (!rows.length) return []
  const ids = rows.map(row => row.id)
  const { data: items, error: itemsError } = await supabase!
    .from('music_playlist_tracks').select('playlist_id,track_post_id,position')
    .in('playlist_id', ids).order('position', { ascending: true })
  if (itemsError) throw new Error(`Could not load playlist tracks: ${itemsError.message}`)
  const trackIds = new Map<string, string[]>()
  for (const item of items || []) {
    const current = trackIds.get(item.playlist_id) || []
    current.push(item.track_post_id)
    trackIds.set(item.playlist_id, current)
  }
  return rows.map(row => ({
    id: row.id, name: row.name, description: row.description || '', coverUrl: row.cover_url || '',
    visibility: row.visibility || 'private', isCollaborative: Boolean(row.is_collaborative),
    trackIds: trackIds.get(row.id) || [],
    createdBy: row.user_id === user.id ? 'You' : 'Collaborator',
    isUserPlaylist: row.user_id === user.id,
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
  // Track rows are the source of truth for shared playlists. Do not attempt
  // owner-only playlist metadata writes when an invited editor adds a track.
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

export async function updateCloudPlaylistVisibility(playlistId: string, visibility: 'private' | 'public'): Promise<void> {
  await requireUser()
  const { error } = await supabase!.from('music_playlists')
    .update({ visibility, updated_at: new Date().toISOString() })
    .eq('id', playlistId)
  if (error) throw new Error(`Could not update playlist visibility: ${error.message}`)
}

export async function moveCloudPlaylistTrack(playlistId: string, trackId: string, direction: -1 | 1): Promise<void> {
  await requireUser()
  const { data, error } = await supabase!.from('music_playlist_tracks')
    .select('id,track_post_id,position').eq('playlist_id', playlistId).order('position', { ascending: true })
  if (error) throw new Error(`Could not load playlist order: ${error.message}`)
  const rows = data || []
  const index = rows.findIndex((row) => row.track_post_id === trackId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= rows.length) return
  const current = rows[index]
  const neighbor = rows[target]
  const first = await supabase!.from('music_playlist_tracks').update({ position: neighbor.position }).eq('id', current.id)
  if (first.error) throw new Error(`Could not move track: ${first.error.message}`)
  const second = await supabase!.from('music_playlist_tracks').update({ position: current.position }).eq('id', neighbor.id)
  if (second.error) throw new Error(`Playlist order partially updated: ${second.error.message}`)
  await supabase!.from('music_playlists').update({ updated_at: new Date().toISOString() }).eq('id', playlistId)
}

export async function recordCloudPlaylistPlay(playlistId: string, track: Track): Promise<void> {
  const user = await requireUser()
  const trackId = track.postId || track.id
  if (!UUID.test(trackId)) return
  const { error } = await supabase!.from('music_playlist_play_history').insert({
    playlist_id: playlistId, track_post_id: trackId, user_id: user.id,
  })
  if (error) throw new Error(`Could not record playlist listening history: ${error.message}`)
}

export interface PlaylistCollaborator { userId:string; username:string; role:'editor'|'viewer'; status:'pending'|'accepted'|'declined' }
export async function setPlaylistCollaborative(playlistId:string, enabled:boolean):Promise<void>{
 await requireUser()
 const {error}=await supabase!.from('music_playlists').update({is_collaborative:enabled,updated_at:new Date().toISOString()}).eq('id',playlistId)
 if(error)throw new Error('Could not update collaboration settings: '+error.message)
 if(!enabled){
  const {error:inviteError}=await supabase!.from('music_playlist_collaborators').delete().eq('playlist_id',playlistId)
  if(inviteError)throw new Error('Collaboration was disabled, but old invitations could not be cleared: '+inviteError.message)
 }
}
export async function fetchPlaylistCollaborators(playlistId:string):Promise<PlaylistCollaborator[]>{
 await requireUser()
 const {data,error}=await supabase!.from('music_playlist_collaborators').select('user_id,role,status').eq('playlist_id',playlistId)
 if(error)throw new Error('Could not load collaborators: '+error.message)
 const ids=(data||[]).map(row=>row.user_id)
 if(!ids.length)return []
 const {data:profiles,error:profileError}=await supabase!.from('profiles').select('id,username').in('id',ids)
 if(profileError)throw new Error('Could not load collaborator profiles: '+profileError.message)
 return (data||[]).map(row=>({userId:row.user_id,username:profiles?.find(p=>p.id===row.user_id)?.username||'Kus-lord',role:row.role,status:row.status}))
}
export async function invitePlaylistCollaborator(playlistId:string,username:string):Promise<void>{
 const owner=await requireUser()
 const clean=username.trim().replace(/^@/,'').toLowerCase()
 if(!clean)throw new Error('Enter a username.')
 const {data:profile,error:profileError}=await supabase!.from('profiles').select('id').ilike('username',clean).maybeSingle()
 if(profileError)throw new Error(profileError.message)
 if(!profile)throw new Error('No account found with that username.')
 if(profile.id===owner.id)throw new Error('You already own this playlist.')
 const {error}=await supabase!.from('music_playlist_collaborators').insert({playlist_id:playlistId,user_id:profile.id,invited_by:owner.id,role:'editor',status:'pending'})
 if(error)throw new Error(/duplicate|unique/i.test(error.message)?'This person has already been invited.':error.message)
 await setPlaylistCollaborative(playlistId,true)
}
export async function respondToPlaylistInvite(playlistId:string,accept:boolean):Promise<void>{
 const user=await requireUser()
 const {error}=await supabase!.from('music_playlist_collaborators').update({status:accept?'accepted':'declined'}).eq('playlist_id',playlistId).eq('user_id',user.id).eq('status','pending')
 if(error)throw new Error('Could not respond to invitation: '+error.message)
}
export async function fetchMyPlaylistInvites():Promise<Array<{playlistId:string;playlistName:string;invitedBy:string}>>{
 const user=await requireUser()
 const {data,error}=await supabase!.from('music_playlist_collaborators').select('playlist_id,invited_by').eq('user_id',user.id).eq('status','pending')
 if(error)throw new Error(error.message)
 const ids=(data||[]).map(row=>row.playlist_id)
 if(!ids.length)return []
 const {data:playlists,error:playlistError}=await supabase!.from('music_playlists').select('id,name').in('id',ids)
 if(playlistError)throw new Error(playlistError.message)
 return (data||[]).map(row=>({playlistId:row.playlist_id,playlistName:playlists?.find(p=>p.id===row.playlist_id)?.name||'Shared playlist',invitedBy:row.invited_by}))
}

export async function removePlaylistCollaborator(playlistId:string,userId:string):Promise<void>{
 await requireUser()
 const {error}=await supabase!.from('music_playlist_collaborators').delete().eq('playlist_id',playlistId).eq('user_id',userId)
 if(error)throw new Error('Could not remove collaborator: '+error.message)
}
