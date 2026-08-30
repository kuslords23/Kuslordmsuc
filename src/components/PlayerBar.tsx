interface PlayerBarProps {
  title?: string
  artist?: string
  cover?: string
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (time: number) => void
  onVolume: (value: number) => void
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlayerBar({
  title,
  artist,
  cover,
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolume,
}: PlayerBarProps) {
  return (
    <footer className="player-bar">
      <div className="player-left">
        <div className="now-playing-cover" style={{ background: cover || 'linear-gradient(135deg, #666, #333)' }}>
          <span>{isPlaying ? '♪' : ''}</span>
        </div>
        <div className="now-playing-meta">
          <strong>{title || 'Nothing Playing'}</strong>
          <span>{artist || 'Harmony'}</span>
        </div>
      </div>

      <div className="player-center">
        <div className="player-buttons">
          <button className="control" onClick={onPrev}>⏮</button>
          <button className="play-btn" onClick={onTogglePlay}>{isPlaying ? '❚❚' : '▶'}</button>
          <button className="control" onClick={onNext}>⏭</button>
        </div>
        <div className="progress-row">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="range"
          />
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <span className="volume-icon">🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => onVolume(Number(e.target.value))}
          className="range volume"
        />
      </div>
    </footer>
  )
}