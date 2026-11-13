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
  onOpenComments?: () => void
  liked?: boolean
  likes?: number
  onToggleLike?: () => void
  likeBusy?: boolean
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
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
  onOpenComments,
  liked = false,
  likes = 0,
  onToggleLike,
  likeBusy = false,
}: PlayerBarProps) {
  return (
    <footer className="player-bar">
      <div className="player-left">
        <div
          className="now-playing-cover"
          style={cover?.startsWith('http') ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' } : cover ? { background: cover } : undefined}
        >
          <span>{isPlaying ? '♪' : ''}</span>
        </div>
        <div className="now-playing-meta">
          <strong>{title}</strong>
          <span>{artist}</span>
        </div>
        {onOpenComments && (
          <button className="like-btn" type="button" onClick={onOpenComments} title="Comments" aria-label="Open comments">
            💬
          </button>
        )}
        {onToggleLike && (
          <button className={`like-btn track-like-btn ${liked ? 'liked' : ''}`} type="button" onClick={onToggleLike} disabled={likeBusy} title={liked ? 'Unlike track' : 'Like track'} aria-label={liked ? 'Unlike track' : 'Like track'}>
            {liked ? '♥' : '♡'} <small>{likes}</small>
          </button>
        )}
      </div>

      <div className="player-center">
        <div className="player-buttons">
          <button className="control" onClick={onPrev} title="Previous">⏮</button>
          <button className="play-btn" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? '❚❚' : '▶'}
          </button>
          <button className="control" onClick={onNext} title="Next">⏭</button>
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