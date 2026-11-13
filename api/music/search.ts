type ApiRequest = { method?: string; query?: Record<string, string | string[] | undefined> }
type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (value: unknown) => void
  setHeader: (name: string, value: string) => void
}

let tokenCache: { value: string; expiresAt: number } | null = null

async function spotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID?.trim()
  const secret = process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if (!id || !secret) return null
  if (tokenCache && Date.now() < tokenCache.expiresAt - 30000) return tokenCache.value
  const credentials = Buffer.from(`${id}:${secret}`).toString('base64')
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  if (!response.ok) return null
  const body = await response.json() as { access_token?: string; expires_in?: number }
  if (!body.access_token) return null
  tokenCache = { value: body.access_token, expiresAt: Date.now() + (body.expires_in || 3600) * 1000 }
  return body.access_token
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' })
  const rawQuery = req.query?.q
  const q = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery || '').trim().slice(0, 120)
  const rawLimit = req.query?.limit
  const limit = Math.min(24, Math.max(1, Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit || 12) || 12))
  if (!q) return res.status(200).json({ ok: true, items: [], hint: 'Enter a search term.' })

  const token = await spotifyToken()
  if (!token) return res.status(200).json({
    ok: true,
    items: [],
    hint: 'External catalogue search is not configured. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to the Kus-Lords Music server environment. Direct Spotify, Apple Music and SoundCloud links remain supported.',
    provider: 'spotify',
    configured: false,
    fetchedAt: new Date().toISOString(),
  })

  try {
    const url = new URL('https://api.spotify.com/v1/search')
    url.searchParams.set('q', q)
    url.searchParams.set('type', 'track,artist,album')
    url.searchParams.set('limit', String(Math.min(20, limit)))
    url.searchParams.set('market', 'GH')
    const response = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) return res.status(502).json({ ok: false, items: [], hint: `Spotify search returned HTTP ${response.status}.` })
    const body = await response.json() as {
      tracks?: { items?: Array<{ id: string; name: string; duration_ms?: number; external_urls?: { spotify?: string }; album?: { images?: Array<{ url: string }> }; artists?: Array<{ name: string }> }> }
      artists?: { items?: Array<{ id: string; name: string; external_urls?: { spotify?: string }; images?: Array<{ url: string }> }> }
      albums?: { items?: Array<{ id: string; name: string; external_urls?: { spotify?: string }; images?: Array<{ url: string }>; artists?: Array<{ name: string }> }> }
    }
    const items = [
      ...(body.tracks?.items || []).map((track) => ({
        id: `spotify-track-${track.id}`,
        title: track.name,
        artist: (track.artists || []).map((artist) => artist.name).join(', ') || 'Spotify artist',
        coverUrl: track.album?.images?.[0]?.url || '',
        embedUrl: `https://open.spotify.com/embed/track/${track.id}`,
        openUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        platform: 'Spotify',
        kind: 'track',
        duration: Math.round((track.duration_ms || 0) / 1000),
      })),
      ...(body.artists?.items || []).map((artist) => ({
        id: `spotify-artist-${artist.id}`,
        title: artist.name,
        artist: artist.name,
        coverUrl: artist.images?.[0]?.url || '',
        embedUrl: `https://open.spotify.com/embed/artist/${artist.id}`,
        openUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
        platform: 'Spotify',
        kind: 'artist',
        duration: 0,
      })),
      ...(body.albums?.items || []).map((album) => ({
        id: `spotify-album-${album.id}`,
        title: album.name,
        artist: (album.artists || []).map((artist) => artist.name).join(', ') || 'Spotify artist',
        coverUrl: album.images?.[0]?.url || '',
        embedUrl: `https://open.spotify.com/embed/album/${album.id}`,
        openUrl: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
        platform: 'Spotify',
        kind: 'album',
        duration: 0,
      })),
    ].slice(0, limit)
    return res.status(200).json({ ok: true, query: q, provider: 'spotify', configured: true, items, count: items.length, fetchedAt: new Date().toISOString() })
  } catch (error) {
    return res.status(502).json({ ok: false, items: [], hint: error instanceof Error ? error.message : 'External catalogue search failed.' })
  }
}
