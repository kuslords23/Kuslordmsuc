import { supabase } from './supabase'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function toggleMusicTrackLike(trackPostId: string): Promise<boolean> {
  if (!supabase) throw new Error('The shared music database is not configured.')
  if (!UUID.test(trackPostId)) throw new Error('Only published music tracks can be liked.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in to like music.')
  const { data: existing, error: readError } = await supabase
    .from('music_track_likes')
    .select('track_post_id')
    .eq('user_id', auth.user.id)
    .eq('track_post_id', trackPostId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (existing) {
    const { error } = await supabase.from('music_track_likes')
      .delete().eq('user_id', auth.user.id).eq('track_post_id', trackPostId)
    if (error) throw new Error(error.message)
    return false
  }
  const { error } = await supabase.from('music_track_likes').insert({
    user_id: auth.user.id,
    track_post_id: trackPostId,
  })
  if (error) throw new Error(error.message)
  return true
}
