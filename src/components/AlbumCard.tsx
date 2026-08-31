import { Album } from '../data/music'

interface AlbumCardProps {
  album: Album
  onPlay: (album: Album) => void
  onSelect: (album: Album) => void
}

export default function AlbumCard({ album, onPlay, onSelect }: AlbumCardProps) {
  return (
    <div className="album-card" onClick={() => onSelect(album)}>
      <div className="album-cover" style={{ background: album.cover }}>
        <div
          className="play-overlay"
          onClick={(e) => {
            e.stopPropagation()
            onPlay(album)
          }}
        >
          <span className="play-arrow">▶</span>
        </div>
        <span className="album-badge">
          {album.category === 'sports' ? '⚡ STADIUM' : `${album.tracks.length} Songs`}
        </span>
      </div>
      <div className="album-meta">
        <strong>{album.title}</strong>
        <span>{album.artist}</span>
      </div>
    </div>
  )
}