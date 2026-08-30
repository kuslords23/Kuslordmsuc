import { albums } from '../data/music'

interface SidebarProps {
  search: string
  setSearch: (value: string) => void
  onNavigateHome: () => void
  onSelectAlbum: (id: string) => void
  activeAlbumId: string | null
}

const NavButton = ({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) => (
  <button
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <span className={`nav-dot ${active ? 'active' : ''}`} />
    {label}
  </button>
)

export default function Sidebar({ search, setSearch, onNavigateHome, onSelectAlbum, activeAlbumId }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">𝄞</div>
        <span>Harmony</span>
      </div>

      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search songs, artists..."
          aria-label="Search"
        />
      </div>

      <nav className="nav-list">
        <NavButton label="Home" onClick={onNavigateHome} />
        <NavButton label="Browse" onClick={onNavigateHome} />
        <NavButton label="Radio" onClick={onNavigateHome} />
        <NavButton label="Browse by Mood" onClick={onNavigateHome} />
      </nav>

      <div className="library-heading">Your Library</div>
      <nav className="nav-list compact">
        {albums.map((album) => (
          <button
            key={album.id}
            className={`album-item ${activeAlbumId === album.id ? 'active' : ''}`}
            onClick={() => onSelectAlbum(album.id)}
          >
            <span className="album-chip" style={{ background: album.cover }} />
            {album.title}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">J</div>
        <div>
          <strong>Kuslord</strong>
          <span>Plan: Student</span>
        </div>
      </div>
    </aside>
  )
}