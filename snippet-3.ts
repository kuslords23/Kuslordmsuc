// Real-time subscription to track changes via Supabase Realtime
useEffect(() => {
  const unsubscribe = subscribeToTrackChanges(
    // INSERT
    (newTrack) => {
      setTracks((prev) => {
        // avoid duplicates
        if (prev.find(t => t.id === newTrack.id)) return prev
        return [newTrack, ...prev]
      })
    },
    // UPDATE
    (updatedTrack) => {
      setTracks((prev) =>
        prev.map(t => t.id === updatedTrack.id ? updatedTrack : t)
      )
    },
    // DELETE
    (deletedId) => {
      setTracks((prev) => prev.filter(t => t.id !== deletedId))
    }
  )

  return () => {
    unsubscribe()
  }
}, [])