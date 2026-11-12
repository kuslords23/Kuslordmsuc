export type MusicEmbedPlatform = 'spotify' | 'appleMusic' | 'soundcloud'
export type MusicEmbedResourceType = 'artist' | 'album' | 'track' | 'playlist' | 'user'

export interface ParsedMusicLink {
  platform: MusicEmbedPlatform
  resourceType: MusicEmbedResourceType
  id: string
  openUrl: string
  embedUrl: string
  storefront?: string
}

const SPOTIFY_ID = /^[0-9A-Za-z]{22}$/
const APPLE_ID = /^\d{5,}$/

function spotifyPath(type: MusicEmbedResourceType) {
  return type === 'artist' ? 'artist' : type === 'album' ? 'album' : type === 'playlist' ? 'playlist' : 'track'
}

function parseSpotify(raw: string): ParsedMusicLink | null {
  if (SPOTIFY_ID.test(raw)) {
    return {
      platform: 'spotify', resourceType: 'track', id: raw,
      openUrl: `https://open.spotify.com/track/${raw}`,
      embedUrl: `https://open.spotify.com/embed/track/${raw}?utm_source=generator`,
    }
  }
  if (raw.startsWith('spotify:')) {
    const [, kind, id] = raw.split(':')
    if (!id || !SPOTIFY_ID.test(id)) return null
    const type: MusicEmbedResourceType = kind === 'album' ? 'album' : kind === 'playlist' ? 'playlist' : kind === 'track' ? 'track' : 'artist'
    return {
      platform: 'spotify', resourceType: type, id,
      openUrl: `https://open.spotify.com/${spotifyPath(type)}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${spotifyPath(type)}/${id}?utm_source=generator`,
    }
  }
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !(url.hostname === 'spotify.com' || url.hostname.endsWith('.spotify.com'))) return null
    const parts = url.pathname.split('/').filter(Boolean)
    let index = parts[0]?.startsWith('intl-') ? 1 : 0
    if (parts[index] === 'embed') index++
    const kind = parts[index]
    const id = parts[index + 1] || ''
    if (!SPOTIFY_ID.test(id)) return null
    const type: MusicEmbedResourceType = kind === 'album' ? 'album' : kind === 'playlist' ? 'playlist' : kind === 'track' ? 'track' : kind === 'artist' ? 'artist' : 'track'
    return {
      platform: 'spotify', resourceType: type, id,
      openUrl: `https://open.spotify.com/${spotifyPath(type)}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${spotifyPath(type)}/${id}?utm_source=generator`,
    }
  } catch { return null }
}

function parseAppleMusic(raw: string): ParsedMusicLink | null {
  if (APPLE_ID.test(raw)) {
    return {
      platform: 'appleMusic', resourceType: 'artist', id: raw, storefront: 'us',
      openUrl: `https://music.apple.com/us/artist/${raw}`,
      embedUrl: `https://embed.music.apple.com/us/artist/${raw}`,
    }
  }
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (url.protocol !== 'https:' || (host !== 'music.apple.com' && host !== 'itunes.apple.com')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const storefront = parts[0]?.length === 2 ? parts[0] : 'us'
    const index = parts[0]?.length === 2 ? 1 : 0
    const kind = parts[index]
    if (kind !== 'artist' && kind !== 'album' && kind !== 'song') return null
    const slug = parts[index + 1]
    let id = (parts[index + 2] || '').replace(/^id/, '')
    let embedKind = kind
    if (kind === 'album' && url.searchParams.get('i')) {
      id = url.searchParams.get('i') || ''
      embedKind = 'song'
    }
    if (!APPLE_ID.test(id)) return null
    const resourceType: MusicEmbedResourceType = embedKind === 'song' ? 'track' : embedKind
    const path = slug && embedKind !== 'song' ? `/${encodeURIComponent(slug)}/${id}` : `/${id}`
    return {
      platform: 'appleMusic', resourceType, id, storefront,
      openUrl: `https://music.apple.com/${storefront}/${embedKind}${path}`,
      embedUrl: `https://embed.music.apple.com/${storefront}/${embedKind}${path}`,
    }
  } catch { return null }
}

function parseSoundCloud(raw: string): ParsedMusicLink | null {
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (url.protocol !== 'https:' || (host !== 'soundcloud.com' && !host.endsWith('.soundcloud.com'))) return null
    const path = url.pathname.split('/').filter(Boolean).join('/')
    if (!path) return null
    const resourceType: MusicEmbedResourceType = path.split('/').length === 1 ? 'user' : path.split('/')[1] === 'sets' ? 'playlist' : 'track'
    const openUrl = `https://soundcloud.com/${path}`
    const params = new URLSearchParams({
      url: openUrl, color: '#c9a227', auto_play: 'false',
      hide_related: 'false', show_comments: 'false', show_user: 'true',
      show_reposts: 'false', show_teaser: 'true', visual: 'true',
    })
    return { platform: 'soundcloud', resourceType, id: path, openUrl, embedUrl: `https://w.soundcloud.com/player/?${params.toString()}` }
  } catch { return null }
}

/** Parse official Spotify, Apple Music, and SoundCloud URLs/URIs into their licensed embed players. */
export function parseMusicLink(input: string): ParsedMusicLink | null {
  const raw = input.trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower.startsWith('spotify:') || lower.includes('spotify.com')) return parseSpotify(raw)
  if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) return parseAppleMusic(raw)
  if (lower.includes('soundcloud.com')) return parseSoundCloud(raw)
  return null
}

export function musicEmbedHeight(platform: MusicEmbedPlatform, resourceType: MusicEmbedResourceType): number {
  if (platform === 'soundcloud') return 300
  if (platform === 'appleMusic') return resourceType === 'artist' ? 450 : 175
  if (resourceType === 'artist' || resourceType === 'playlist' || resourceType === 'album') return 352
  return 152
}
