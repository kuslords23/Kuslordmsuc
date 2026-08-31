import { Album, Track } from '../data/music'

interface PlaylistViewProps {
  album: Album
  currentTrackId?: string | null
  isPlaying: boolean
  onPlayTrack: (track: Track, allTracks: Track[]) => void
  onTogglePlay: () => void
  onLikeTrack: (id: string) => void
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistView({
  album,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onTogglePlay,
  onLikeTrack,
}: PlaylistViewProps) {
  const isAlbumPlaying = isPlaying && album.tracks.some((t) => t.id === currentTrackId)

  const handlePlayButtonClick = () => {
    if (isAlbumPlaying) {
      onTogglePlay()
    } else if (album.tracks.length > 0) {
      onPlayTrack(album.tracks[0], album.tracks)
    }
  }

  return (
    <div className="playlist-view">
      <div className="playlist-hero" style={{ background: album.cover }}>
        <div className="playlist-art-blur" />
        <div className="playlist-info">
          <span className="album-type">
            👑 ROYAL {album.category.toUpperCase()} SOUNDTRACK
          </span>
          <h1>{album.title}</h1>
          <p>{album.description}</p>
          <div className="playlist-hero-actions">
            <button className="play-all" onClick={handlePlayButtonClick}>
              {isAlbumPlaying ? '⏸ Pause Playlist' : '▶ Play Full Album'}
            </button>
            <span className="total-tracks">{album.tracks.length} Tracks</span>
          </div>
        </div>
      </div>

      <div className="track-table">
        <div className="track-row track-header">
          <span className="col-idx">#</span>
          <span className="col-title">Title</span>
          <span className="col-artist">Artist & Vibe</span>
          <span className="col-likes">Likes</span>
          <span className="col-time">Time</span>
        </div>
        {album.tracks.map((track, index) => {
          const isCurrent = currentTrackId === track.id
          return (
            <div
              key={track.id}
              className={`track-row ${isCurrent ? 'current' : ''}`}
              onClick={() => onPlayTrack(track, album.tracks)}
            >
              <span className="col-idx">
                {isCurrent ? (isPlaying ? '♪' : '❚❚') : index + 1}
              </span>
              <span className="col-title">
                <div
                  className="mini-cover"
                  style={{
                    background: track.cover.startsWith('http')
                      ? `url(${track.cover}) center/cover`
                      : track.cover,
                  }}
                />
                <div className="track-title-block">
                  <strong>{track.title}</strong>
                  {track.isSportsAnthem && <span className="sports-chip">STADIUM</span>}
                </div>
              </span>
              <span className="col-artist">
                {track.artist}
                {track.matchVibe && <small> • {track.matchVibe}</small>}
              </span>
              <span
                className="col-likes"
                onClick={(e) => {
                  e.stopPropagation()
                  onLikeTrack(track.id)
                }}
              >
                ❤️ {track.likes || 0}
              </span>
              <span className="col-time">{formatTime(track.duration)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}