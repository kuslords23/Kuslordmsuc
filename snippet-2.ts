import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message } = req.body || {}
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' })
  }

  const lower = message.toLowerCase()
  let reply = ''

  if (lower.includes('remix')) {
    reply = 'To remix a track: load the original into the beat pads, then layer a new drum pattern and use the ElevenLabs voice for a spoken intro.'
  } else if (lower.includes('key')) {
    reply = 'Most Kus-lords tracks are in A minor or C major. Use the mixing panel to match energy and avoid clashing frequencies.'
  } else if (lower.includes('tempo') || lower.includes('bpm')) {
    reply = 'Club-ready Kus-lords anthems sit around 124–128 BPM. For stadium walkouts, try 140 BPM with an epic orchestral build.'
  } else if (lower.includes('upload')) {
    reply = 'Use the Upload button in the sidebar to push your finished track to the shared kus-music bucket and feed_posts table.'
  } else {
    reply = 'Great question! For now, I can suggest remix ideas, key matches, BPM targets, and upload workflows for the Kus-lords cloud.'
  }

  return res.status(200).json({ reply })
}