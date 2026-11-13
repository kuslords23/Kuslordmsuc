type ApiRequest = { method?: string; body?: { text?: string; voice?: string }; headers: Record<string, string | string[] | undefined> }
type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (value: unknown) => void
  setHeader: (name: string, value: string) => void
  send: (value: ArrayBuffer | Uint8Array) => void
}

const VOICES = new Set([
  '21m00Tcm4TlvDq8ikWAM',
  'AZnzlk1XvdvUeBnXmlld',
  'EXAVITQu4vr4xnSDxMaL',
  'ErXwobaYiN019PkySvjV',
  'MF3mGyEYCl7XYWbV9V6O',
])

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : ''
  const voice = typeof req.body?.voice === 'string' ? req.body.voice : ''
  if (!text || text.length > 2500) return res.status(400).json({ error: 'Enter narration text between 1 and 2,500 characters.' })
  if (!VOICES.has(voice)) return res.status(400).json({ error: 'Choose a supported ElevenLabs voice.' })

  const authorization = req.headers.authorization
  const token = Array.isArray(authorization) ? authorization[0] : authorization
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!token?.startsWith('Bearer ') || !supabaseUrl || !supabaseKey) {
    return res.status(401).json({ error: 'Sign in to use voice generation.' })
  }

  try {
    const identity = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: token },
    })
    if (!identity.ok) return res.status(401).json({ error: 'Your session has expired. Sign in again.' })
  } catch {
    return res.status(503).json({ error: 'Could not verify your account with Supabase.' })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the Kus-Lords Music Vercel project.' })

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    })
    if (!response.ok) {
      const detail = await response.text()
      return res.status(response.status === 429 ? 429 : 502).json({
        error: response.status === 429
          ? 'ElevenLabs usage limit reached. Check your provider plan.'
          : 'ElevenLabs could not generate this narration.',
        detail: detail.slice(0, 400),
      })
    }
    const audio = new Uint8Array(await response.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', String(audio.byteLength))
    res.setHeader('Content-Disposition', 'inline; filename="kus-music-narration.mp3"')
    return res.status(200).send(audio)
  } catch {
    return res.status(502).json({ error: 'ElevenLabs voice generation is temporarily unavailable.' })
  }
}
