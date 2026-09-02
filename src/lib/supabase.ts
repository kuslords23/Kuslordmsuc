export async function fetchRemoteTracks(): Promise<Track[]> {
  if (!isSupabaseConfigured()) {
-   return fallbackTracks
+   return Promise.resolve(fallbackTracks)
  }

  try {
    const { data, error } = await supabase
      .from('music_tracks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
-     return fallbackTracks
+     return Promise.resolve(fallbackTracks)
    }

    const fetched: Track[] = data.map((d: DbTrack) => ({
      id: d.id,
      title: d.title,
      artist: d.artist || 'Unknown Artist',
      album: d.album || 'Single',
      duration: d.duration || 210,
      audioUrl: d.audio_url,
      cover: d.cover_url || 'linear-gradient(135deg, #fa2d6c, #fc6f60)',
    }))

    return Promise.resolve([...fetched, ...fallbackTracks])
  } catch {
-   return fallbackTracks
+   return Promise.resolve(fallbackTracks)
  }
}