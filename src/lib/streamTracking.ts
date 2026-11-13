import { supabase } from './supabase'

const locked = new Set<string>()

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function sessionKey(trackPostId: string): string {
  const storageKey = `kus_music_stream_session:${trackPostId}`
  try {
    const existing = sessionStorage.getItem(storageKey)
    if (existing) return existing
    const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `direct_${trackPostId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem(storageKey, next)
    return next
  } catch {
    return `direct_${trackPostId}_${Date.now()}`
  }
}

/**
 * Records one verified direct listen against SCN's canonical stream ledger.
 * A listen qualifies at 30 seconds or on full completion of a shorter track.
 * Playback start alone never increments stream counts.
 */
export async function recordVerifiedDirectStream(
  trackPostId: string | undefined,
  listenedSeconds: number,
  trackDurationSeconds: number,
  completed = false,
): Promise<boolean> {
  if (!supabase || !trackPostId || !isUuid(trackPostId)) return false
  const seconds = Math.max(0, Number(listenedSeconds) || 0)
  const duration = Math.max(0, Number(trackDurationSeconds) || 0)
  const qualifies = seconds >= 30 || (completed && duration > 0 && seconds >= duration)
  if (!qualifies) return false

  const key = `direct:${trackPostId}:${sessionKey(trackPostId)}`
  if (locked.has(key)) return false
  locked.add(key)

  try {
    const { data: auth } = await supabase.auth.getSession()
    const { data, error } = await supabase.rpc('log_music_stream_event_v2', {
      p_track_post_id: trackPostId,
      p_session_key: key.split(':').slice(2).join(':'),
      p_source: 'direct',
      p_listened_seconds: seconds,
      p_viewer_user_id: auth.session?.user.id || null,
      p_video_post_id: null,
      p_track_duration_seconds: duration || null,
    })
    if (error) throw error
    return Boolean(data)
  } catch (error) {
    locked.delete(key)
    console.error('Verified music stream could not be recorded:', error)
    return false
  }
}
