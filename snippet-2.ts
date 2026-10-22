function dbToTrack(db: any): Track | null {
  if (!db || !db.id) return null
  return {
    id: db.id,
    title: db.title,
    artist: db.artist || 'Unknown Artist',
    album: db.album || 'Single',
    duration: db.duration || 210,
    audioUrl: db.audio_url || '',
    cover: db.cover_url || gradient('#fa2d6c, #fc6f60'),
  }
}