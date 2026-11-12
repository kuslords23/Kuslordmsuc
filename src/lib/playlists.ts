import type { Track } from '../data/music'

export interface MusicPlaylist {
  id: string
  name: string
  description?: string
  coverUrl: string
  trackIds: string[]
  createdBy: string
  isUserPlaylist?: boolean
  updatedAt?: string
}

const PLAYLISTS_KEY = 'kus_music_playlists'

export function loadPlaylistsLocal(): MusicPlaylist[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is MusicPlaylist =>
      Boolean(item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.trackIds))
    ).slice(0, 30)
  } catch {
    return []
  }
}

export function savePlaylistsLocal(playlists: MusicPlaylist[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists.slice(0, 30)))
  } catch (error) {
    console.warn('Could not save music playlists on this device:', error)
  }
}

export function createMusicPlaylist(name: string, createdBy: string): MusicPlaylist {
  const cleanName = name.trim().slice(0, 64)
  return {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    coverUrl: '',
    trackIds: [],
    createdBy: createdBy || 'You',
    isUserPlaylist: true,
    updatedAt: new Date().toISOString(),
  }
}

export function addTrackToPlaylist(playlist: MusicPlaylist, track: Track): MusicPlaylist {
  if (playlist.trackIds.includes(track.id)) return playlist
  return {
    ...playlist,
    trackIds: [...playlist.trackIds, track.id].slice(0, 500),
    coverUrl: playlist.coverUrl || track.cover,
    updatedAt: new Date().toISOString(),
  }
}
