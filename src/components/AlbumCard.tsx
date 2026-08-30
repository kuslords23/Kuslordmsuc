import { Album } from '../data/music'

interface AlbumCardProps {
  album: Album
  onPlay: (album: Album) => void
}

export default function AlbumCard({ album, onPlay }: AlbumCardProps) {
  return (
    <div className="album-card" onClick={() => onPlay(album)}>
      <div className="album-cover" style={{ background: album.cover }}>
        <div className="play-overlay">
          <span className="play-arrow">▶</span>
        </div>
        <span className="album-badge">{album.tracks.length} Songs</span>
      </div>
      <div className="album-meta">
        <strong>{album.title}</strong>
        <span>{album.artist}</span>
      </div>
    </div>
  )
}