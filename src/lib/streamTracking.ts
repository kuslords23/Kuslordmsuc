import { supabase } from './supabase'

type PlaybackSession = {
  sessionId: string
  token: string
  lastHeartbeatAt: number
}

const activeSessions = new Map<string, PlaybackSession>()
const pendingStarts = new Map<string, Promise<boolean>>()

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Starts a server-timed playback session. The raw token stays in memory only;
 * Supabase stores its SHA-256 hash. A client cannot submit an arbitrary duration
 * and directly mint a royalty-eligible stream.
 */
export async function startVerifiedPlaybackSession(trackPostId: string | undefined): Promise<boolean> {
  if (!supabase || !trackPostId || !isUuid(trackPostId)) return false
  if (activeSessions.has(trackPostId)) return true
  const pending = pendingStarts.get(trackPostId)
  if (pending) return pending

  const startPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc('start_music_playback_session', {
        p_track_post_id: trackPostId,
      })
      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      if (!row?.session_id || !row?.session_token) return false
      activeSessions.set(trackPostId, {
        sessionId: String(row.session_id),
        token: String(row.session_token),
        lastHeartbeatAt: Date.now(),
      })
      return true
    } catch (error) {
      console.error('Playback session could not be started:', error)
      return false
    } finally {
      pendingStarts.delete(trackPostId)
    }
  })()
  pendingStarts.set(trackPostId, startPromise)
  return startPromise
}

/**
 * The database measures elapsed wall-clock time between heartbeats and expires
 * sessions with gaps over 20 seconds. Heartbeats are throttled to about 10s.
 */
export async function heartbeatVerifiedPlaybackSession(trackPostId: string | undefined): Promise<boolean> {
  if (!supabase || !trackPostId || !isUuid(trackPostId)) return false
  let session = activeSessions.get(trackPostId)
  if (!session) {
    await startVerifiedPlaybackSession(trackPostId)
    return false
  }
  if (Date.now() - session.lastHeartbeatAt < 9000) return true

  try {
    const { data, error } = await supabase.rpc('heartbeat_music_playback_session', {
      p_session_id: session.sessionId,
      p_session_token: session.token,
    })
    if (error) throw error
    if (data !== true) {
      activeSessions.delete(trackPostId)
      await startVerifiedPlaybackSession(trackPostId)
      return false
    }
    session.lastHeartbeatAt = Date.now()
    return true
  } catch (error) {
    activeSessions.delete(trackPostId)
    console.error('Playback heartbeat failed:', error)
    return false
  }
}

/**
 * Completes a session. The database records a stream only after at least 30
 * seconds of server-timed heartbeats and applies a per-viewer/per-track 24h cap.
 */
export async function completeVerifiedPlaybackSession(trackPostId: string | undefined): Promise<boolean> {
  if (!supabase || !trackPostId || !isUuid(trackPostId)) return false
  if (!activeSessions.has(trackPostId)) {
    const pending = pendingStarts.get(trackPostId)
    if (pending) await pending
  }
  const session = activeSessions.get(trackPostId)
  if (!session) return false
  activeSessions.delete(trackPostId)

  try {
    const { data, error } = await supabase.rpc('complete_music_playback_session', {
      p_session_id: session.sessionId,
      p_session_token: session.token,
    })
    if (error) throw error
    return data === true
  } catch (error) {
    console.error('Playback session could not be completed:', error)
    return false
  }
}
