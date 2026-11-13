import { useMemo, useState, type FormEvent } from 'react'
import type { Track } from '../data/music'
import type { MusicPlaylist } from '../lib/playlists'

interface PlaylistLibraryProps {
  playlists: MusicPlaylist[]
  tracks: Track[]
  loading?: boolean
  error?: string
  onCreate: (name: string) => Promise<void>
  onAddTrack: (playlistId: string, track: Track) => Promise<void>
  onRemoveTrack: (playlistId: string, trackId: string) => Promise<void>
  onDeletePlaylist: (playlistId: string) => Promise<void>
  onPlay: (track: Track, queue: Track[]) => void
}

export default function PlaylistLibrary({
  playlists, tracks, loading = false, error = '',
  onCreate, onAddTrack, onRemoveTrack, onDeletePlaylist, onPlay,
}: PlaylistLibraryProps) {
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [trackToAdd, setTrackToAdd] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const selected = playlists.find((playlist) => playlist.id === selectedId) || null
  const selectedTracks = useMemo(
    () => selected ? selected.trackIds.map((id) => tracks.find((track) => (track.postId || track.id) === id)).filter((track): track is Track => Boolean(track)) : [],
    [selected, tracks],
  )

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || playlists.length >= 30 || busy) return
    setBusy(true)
    setActionError('')
    try {
      await onCreate(name)
      setName('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not create playlist.')
    } finally {
      setBusy(false)
    }
  }

  const add = async () => {
    if (!selected || !trackToAdd || busy) return
    const track = tracks.find((item) => item.id === trackToAdd)
    if (!track) return
    setBusy(true)
    setActionError('')
    try {
      await onAddTrack(selected.id, track)
      setTrackToAdd('')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not add track.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (trackId: string) => {
    if (!selected || busy) return
    setBusy(true)
    setActionError('')
    try {
      await onRemoveTrack(selected.id, trackId)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not remove track.')
    } finally {
      setBusy(false)
    }
  }

  const removePlaylist = async () => {
    if (!selected || busy) return
    setBusy(true)
    setActionError('')
    try {
      await onDeletePlaylist(selected.id)
      setSelectedId(null)
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Could not delete playlist.')
    } finally {
      setBusy(false)
    }
  }

  if (selected) {
    return (
      <div className="playlist-library">
        <button className="back-btn" onClick={() => setSelectedId(null)}>← All Playlists</button>
        <div className="section-title"><h2>{selected.name}</h2><span>{selectedTracks.length} tracks</span></div>
        <div className="playlist-add-row">
          <select value={trackToAdd} onChange={(event) => setTrackToAdd(event.target.value)}>
            <option value="">Choose a published track…</option>
            {tracks.filter((track) => !selected.trackIds.includes(track.postId || track.id)).map((track) => (
              <option key={track.id} value={track.id}>{track.title} · {track.artist}</option>
            ))}
          </select>
          <button type="button" onClick={add} disabled={!trackToAdd || busy}>Add track</button>
        </div>
        {selectedTracks.length ? (
          <div className="track-list-compact">
            {selectedTracks.map((track) => (
              <div key={track.id} className="track-row-compact">
                <button className="playlist-track-play" onClick={() => onPlay(track, selectedTracks)}>
                  {track.cover.startsWith('http') ? <img className="mini-cover" src={track.cover} alt="" /> : <span className="mini-cover" />}
                  <span className="track-meta"><strong>{track.title}</strong><span>{track.artist}</span></span>
                </button>
                <button className="playlist-remove-track" onClick={() => void remove(track.postId || track.id)} disabled={busy} aria-label={`Remove ${track.title}`}>✕</button>
              </div>
            ))}
          </div>
        ) : <p className="empty">This cloud playlist is empty. Add a published track from the library.</p>}
        {actionError && <p className="alert error" role="alert">{actionError}</p>}
        <button className="playlist-delete" onClick={() => void removePlaylist()} disabled={busy}>Delete playlist</button>
      </div>
    )
  }

  return (
    <div className="playlist-library">
      <div className="section-title"><h2>Your Playlists</h2><span>{playlists.length}/30</span></div>
      <form className="playlist-create-row" onSubmit={create}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Give your playlist a name" maxLength={64} />
        <button type="submit" disabled={!name.trim() || playlists.length >= 30 || busy}>Create</button>
      </form>
      {actionError && <p className="alert error" role="alert">{actionError}</p>}
      {error && <p className="alert error" role="alert">{error}</p>}
      {loading ? <p className="empty">Loading cloud playlists…</p> : playlists.length ? (
        <div className="playlist-library-grid">
          {playlists.map((playlist) => {
            const count = playlist.trackIds.filter((id) => tracks.some((track) => (track.postId || track.id) === id)).length
            return (
              <button key={playlist.id} className="playlist-library-card" onClick={() => setSelectedId(playlist.id)}>
                {playlist.coverUrl && playlist.coverUrl.startsWith('http')
                  ? <img className="playlist-library-art" src={playlist.coverUrl} alt="" />
                  : <span className="playlist-library-art playlist-library-art-empty">♫</span>}
                <strong>{playlist.name}</strong>
                <small>{count} tracks</small>
              </button>
            )
          })}
        </div>
      ) : <p className="empty">No cloud playlists yet. Create your first playlist.</p>}
      <p className="playlist-storage-note">Playlists are saved to your account and sync across signed-in devices.</p>
    </div>
  )
}
