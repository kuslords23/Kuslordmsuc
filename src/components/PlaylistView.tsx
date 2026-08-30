import { Album, Track } from '../data/music'

interface PlaylistViewProps {
  album: Album
  currentTrackId?: string | null
  isPlaying: boolean
  onPlayTrack: (track: Track, allTracks: Track[]) => void
  onTogglePlay: () => void
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function PlaylistView({ album, currentTrackId, isPlaying, onPlayTrack, onTogglePlay }: PlaylistViewProps) {
  return (
    <div className="playlist-view">
      <div className="playlist-hero" style={{ background: album.cover }}>
        <div className="playlist-art-blur" />
        <div className="playlist-info">
          <span className="album-type">Album</span>
          <h1>{album.title}</h1>
          <p>{album.description}</p>
          <button className="play-all" onClick={() => onPlayTrack(album.tracks[0], album.tracks)}>
            {currentTrackId && isPlaying ? <span onClick={onTogglePlay}>⏸ Pause</span> : <span>▶ Play</span>}
          </button>
        </div>
      </div>

      <div className="track-table">
        <div className="track-row track-header">
          <span className="col-idx">#</span>
          <span className="col-title">Title</span>
          <span className="col-artist">Artist</span>
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
              <span className="col-idx">{isCurrent ? (isPlaying ? '♪' : '❚❚') : index + 1}</span>
              <span className="col-title">
                <div className="mini-cover" style={{ background: album.cover }} />
                {track.title}
              </span>
              <span className="col-artist">{track.artist}</span>
              <span className="col-time">{formatTime(track.duration)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}