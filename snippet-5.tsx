  const handleParentMessage = useCallback((event: MessageEvent) => {
    if (!event.data || typeof event.data !== 'object') return
    
    const { type, payload } = event.data
    
    // Only respond to messages from the same origin or trusted parent
    const allowedOrigins = [
      window.location.origin,
      'https://sport-clan-nexus.vercel.app',
    ]
    if (!allowedOrigins.includes(event.origin)) return

    switch (type) {
      case 'PLAY_ANTHEM': {
        if (typeof payload?.matchId === 'string') {
          // Find the track in current tracks (using ref to avoid stale closure)
          const match = sportsMatches.find(m => m.id === payload.matchId)
          if (match && match.anthemTrackId) {
            const track = currentTrackRef.current?.id === match.anthemTrackId
              ? currentTrackRef.current
              : tracks.find(t => t.id === match.anthemTrackId) || tracks[0]
            if (track) {
              playTrack(track, tracks)
            }
          }
        }
        break
      }
      case 'TOGGLE_PLAY':
        togglePlay()
        break
      case 'NEXT_TRACK':
        nextTrack()
        break
      case 'PREV_TRACK':
        prevTrack()
        break
      case 'SET_VOLUME':
        if (typeof payload?.volume === 'number' && payload.volume >= 0 && payload.volume <= 1) {
          handleVolume(payload.volume)
        }
        break
      case 'SEEK':
        if (typeof payload?.time === 'number') {
          handleSeek(payload.time)
        }
        break
      case 'GET_STATE': {
        const source = event.source as Window
        if (source && typeof source.postMessage === 'function') {
          source.postMessage(
            { 
              type: 'PLAYBACK_STATE', 
              payload: {
                isPlaying,
                currentTrackId: currentTrack?.id,
                currentTime: Math.floor(currentTime),
                duration: Math.floor(duration),
                volume,
                queue: queue.map(t => t.id)
              }
            },
            event.origin
          )
        }
        break
      }
      case 'SET_QUEUE':
        if (Array.isArray(payload?.trackIds)) {
          const newQueue = tracks.filter(t => payload.trackIds.includes(t.id))
          if (newQueue.length > 0) {
            setQueue(newQueue)
            if (!currentTrack || !payload.trackIds.includes(currentTrack.id)) {
              playTrack(newQueue[0], newQueue)
            }
          }
        }
        break
    }
  }, [tracks, playTrack, togglePlay, nextTrack, prevTrack, handleVolume, handleSeek, currentTrack, currentTime, duration, volume, queue])