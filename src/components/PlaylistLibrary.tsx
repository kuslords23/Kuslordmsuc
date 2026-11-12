import { useMemo, useState, type FormEvent } from 'react'
import type { Track } from '../data/music'
import { addTrackToPlaylist, createMusicPlaylist, type MusicPlaylist } from '../lib/playlists'

interface PlaylistLibraryProps {
  playlists: MusicPlaylist[]
  tracks: Track[]
  createdBy: string
  onChange: (playlists: MusicPlaylist[]) => void
  onPlay: (track: Track, queue: Track[]) => void
}

export default function PlaylistLibrary({ playlists, tracks, createdBy, onChange, onPlay }: PlaylistLibraryProps) {
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [trackToAdd, setTrackToAdd] = useState('')
  const selected = playlists.find((playlist) => playlist.id === selectedId) || null
  const selectedTracks = useMemo(
    () => selected ? selected.trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => Boolean(track)) : [],
    [selected, tracks],
  )

  const create = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || playlists.length >= 30) return
    const next = createMusicPlaylist(name, createdBy)
    onChange([next, ...playlists])
    setSelectedId(next.id)
    setName('')
  }

  const add = () => {
    if (!selected || !trackToAdd) return
    const track = tracks.find((item) => item.id === trackToAdd)
    if (!track) return
    onChange(playlists.map((item) => item.id === selected.id ? addTrackToPlaylist(item, track) : item))
    setTrackToAdd('')
  }

  const remove = (trackId: string) => {
    if (!selected) return
    onChange(playlists.map((item) => item.id === selected.id
      ? { ...item, trackIds: item.trackIds.filter((id) => id !== trackId), updatedAt: new Date().toISOString() }
      : item))
  }

  if (selected) {
    return (
      <div className="playlist-library">
        <button className="back-btn" onClick={() => setSelectedId(null)}>← All Playlists</button>
        <div className="section-title"><h2>{selected.name}</h2><span>{selectedTracks.length} tracks</span></div>
        <div className="playlist-add-row">
          <select value={trackToAdd} onChange={(event) => setTrackToAdd(event.target.value)}>
            <option value="">Choose a track to add…</option>
            {tracks.filter((track) => !selected.trackIds.includes(track.id)).map((track) => (
              <option key={track.id} value={track.id}>{track.title} · {track.artist}</option>
            ))}
          </select>
          <button type="button" onClick={add} disabled={!trackToAdd}>Add track</button>
        </div>
        {selectedTracks.length ? (
          <div className="track-list-compact">
            {selectedTracks.map((track) => (
              <div key={track.id} className="track-row-compact">
                <button className="playlist-track-play" onClick={() => onPlay(track, selectedTracks)}>
                  <div className="mini-cover" style={{ background: track.cover }} />
                  <span className="track-meta"><strong>{track.title}</strong><span>{track.artist}</span></span>
                </button>
                <button className="playlist-remove-track" onClick={() => remove(track.id)} aria-label={`Remove ${track.title}`}>✕</button>
              </div>
            ))}
          </div>
        ) : <p className="empty">This playlist is empty. Add tracks from your library.</p>}
        <button className="playlist-delete" onClick={() => { onChange(playlists.filter((item) => item.id !== selected.id)); setSelectedId(null) }}>Delete playlist</button>
      </div>
    )
  }

  return (
    <div className="playlist-library">
      <div className="section-title"><h2>Your Playlists</h2><span>{playlists.length}/30</span></div>
      <form className="playlist-create-row" onSubmit={create}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Give your playlist a name" maxLength={64} />
        <button type="submit" disabled={!name.trim() || playlists.length >= 30}>Create</button>
      </form>
      {playlists.length ? (
        <div className="playlist-library-grid">
          {playlists.map((playlist) => {
            const count = playlist.trackIds.filter((id) => tracks.some((track) => track.id === id)).length
            return (
              <button key={playlist.id} className="playlist-library-card" onClick={() => setSelectedId(playlist.id)}>
                <span className="playlist-library-art" style={{ background: playlist.coverUrl || 'linear-gradient(135deg, #d4af37, #614ad2)' }}>♫</span>
                <strong>{playlist.name}</strong>
                <small>{count} tracks</small>
              </button>
            )
          })}
        </div>
      ) : <p className="empty">You haven't created a playlist yet.</p>}
      <p className="playlist-storage-note">Playlists are saved on this device, matching SCN's current local playlist storage. Cloud sync is a separate future step.</p>
    </div>
  )
}
