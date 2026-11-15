import type { Track } from '../data/music'

export type ExternalMusicHistoryItem = {
  id: string
  title: string
  artist: string
  coverUrl: string
  embedUrl: string
  openUrl: string
  platform: string
  kind: 'track' | 'artist' | 'album' | 'playlist'
  duration: number
}

export type MusicHistoryEntry = {
  key: string
  playedAt: number
  source: 'kus' | 'external'
  track?: Track
  external?: ExternalMusicHistoryItem
}

const STORAGE_KEY = 'kuslords.music.recently-played.v1'
const MAX_HISTORY = 50

export function readMusicHistory(): MusicHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is MusicHistoryEntry =>
      Boolean(entry && typeof entry.key === 'string' && typeof entry.playedAt === 'number' &&
      (entry.source === 'kus' || entry.source === 'external')),
    ).slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

function save(entries: MusicHistoryEntry[]): MusicHistoryEntry[] {
  const next = entries.slice(0, MAX_HISTORY)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch (error) {
    console.warn('Could not persist local music history:', error)
  }
  return next
}

export function recordKusTrack(history: MusicHistoryEntry[], track: Track): MusicHistoryEntry[] {
  const key = 'kus:' + (track.postId || track.id)
  return save([{ key, playedAt: Date.now(), source: 'kus', track }, ...history.filter(item => item.key !== key)])
}

export function recordExternalTrack(history: MusicHistoryEntry[], external: ExternalMusicHistoryItem): MusicHistoryEntry[] {
  const key = 'external:' + external.platform.toLowerCase() + ':' + external.id
  return save([{ key, playedAt: Date.now(), source: 'external', external }, ...history.filter(item => item.key !== key)])
}
