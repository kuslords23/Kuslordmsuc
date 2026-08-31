import { User } from '@supabase/supabase-js'
import { Album } from '../data/music'

interface SidebarProps {
  search: string
  setSearch: (value: string) => void
  onNavigateHome: () => void
  onSelectAlbum: (id: string) => void
  activeAlbumId: string | null
  albums: Album[]
  user: User | null
  onOpenAuth: () => void
  onOpenUpload: () => void
  onSignOut: () => void
}

const NavButton = ({ label, active, onClick, icon }: { label: string; active?: boolean; onClick: () => void; icon?: string }) => (
  <button
    className={`nav-item ${active ? 'active' : ''}`}
    onClick={onClick}
  >
    <span className={`nav-dot ${active ? 'active' : ''}`}>{icon || ''}</span>
    {label}
  </button>
)

export default function Sidebar({
  search,
  setSearch,
  onNavigateHome,
  onSelectAlbum,
  activeAlbumId,
  albums,
  user,
  onOpenAuth,
  onOpenUpload,
  onSignOut,
}: SidebarProps) {
  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Guest'
  const initial = (displayName[0] || 'K').toUpperCase()

  return (
    <aside className="sidebar">
      <div className="logo" onClick={onNavigateHome} style={{ cursor: 'pointer' }}>
        <div className="logo-mark">𝄞</div>
        <div className="logo-text">
          <span>Harmony</span>
          <span className="badge-royal">Kus-lords</span>
        </div>
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
        <NavButton label="Home" active={!activeAlbumId && !search} onClick={onNavigateHome} />
        <NavButton label="Cloud Audio" onClick={onNavigateHome} />
        <NavButton label="Upload to Bucket" onClick={onOpenUpload} />
      </nav>

      <div className="library-heading">
        <span>Albums & Playlists</span>
        <span className="count-pill">{albums.length}</span>
      </div>

      <nav className="nav-list compact">
        {albums.map((album) => (
          <button
            key={album.id}
            className={`album-item ${activeAlbumId === album.id ? 'active' : ''}`}
            onClick={() => onSelectAlbum(album.id)}
          >
            <span className="album-chip" style={{ background: album.cover }} />
            <span className="album-title-text">{album.title}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">{initial}</div>
        <div className="user-info">
          <strong>{displayName}</strong>
          <span>{user ? 'Supabase Auth' : 'Guest Mode'}</span>
        </div>
        {user ? (
          <button className="auth-btn-ghost" title="Sign Out" onClick={onSignOut}>
            ↪
          </button>
        ) : (
          <button className="auth-btn-gold" onClick={onOpenAuth}>
            Sign In
          </button>
        )}
      </div>
    </aside>
  )
}