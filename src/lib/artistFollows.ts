import { supabase } from './supabase'

export async function fetchFollowedArtists(): Promise<Set<string>> {
  if (!supabase) return new Set()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) return new Set()
  const { data, error } = await supabase
    .from('artist_follows')
    .select('artist_profile_id')
    .eq('user_id', auth.user.id)
  if (error) throw new Error(`Could not load followed artists: ${error.message}`)
  return new Set((data || []).map((row) => row.artist_profile_id))
}

export async function toggleCloudArtistFollow(artistProfileId: string): Promise<boolean> {
  if (!supabase) throw new Error('The shared music database is not configured.')
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Sign in to follow artists.')
  const { data: existing, error: readError } = await supabase
    .from('artist_follows')
    .select('artist_profile_id')
    .eq('user_id', auth.user.id)
    .eq('artist_profile_id', artistProfileId)
    .maybeSingle()
  if (readError) throw new Error(readError.message)
  if (existing) {
    const { error } = await supabase.from('artist_follows')
      .delete().eq('user_id', auth.user.id).eq('artist_profile_id', artistProfileId)
    if (error) throw new Error(error.message)
    return false
  }
  const { error } = await supabase.from('artist_follows').insert({
    user_id: auth.user.id,
    artist_profile_id: artistProfileId,
  })
  if (error) throw new Error(error.message)
  return true
}
