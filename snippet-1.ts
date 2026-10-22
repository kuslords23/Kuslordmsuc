export function subscribeToTrackChanges(
  onInsert: (track: Track) => void,
  onUpdate: (track: Track) => void,
  onDelete: (trackId: string) => void
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {} // no-op if not configured
  }

  const channel = supabase.channel('music-tracks-changes')

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'music_tracks' },
    (payload) => {
      const db = payload.new as any
      const track = dbToTrack(db)
      if (track) onInsert(track)
    }
  )

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'music_tracks' },
    (payload) => {
      const db = payload.new as any
      const track = dbToTrack(db)
      if (track) onUpdate(track)
    }
  )

  channel.on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'music_tracks' },
    (payload) => {
      const db = payload.old as any
      if (db && db.id) onDelete(db.id)
    }
  )

  channel.subscribe()

  return () => {
    channel.unsubscribe()
  }
}