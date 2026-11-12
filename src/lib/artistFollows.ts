const FOLLOWED_ARTISTS_KEY = 'kus_followed_artists'

export function loadFollowedArtists(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(FOLLOWED_ARTISTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, 80) : [])
  } catch {
    return new Set()
  }
}

export function saveFollowedArtists(names: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(FOLLOWED_ARTISTS_KEY, JSON.stringify([...names].slice(0, 80)))
  } catch (error) {
    console.warn('Could not save followed artists on this device:', error)
  }
}
