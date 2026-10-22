import { useState, useRef, type FormEvent } from 'react'
import type { Track } from '../data/music'
import './Studio.css'

interface StudioProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
}

const voices = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Default)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },
]

export default function Studio({ tracks, onPlayTrack }: StudioProps) {
  const [assistantMsg, setAssistantMsg] = useState('')
  const [assistantReply, setAssistantReply] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)

  const [ttsText, setTtsText] = useState('Kus-Lords royal music studio is ready to create.')
  const [ttsVoice, setTtsVoice] = useState(voices[0].id)
  const [ttsLoading, setTtsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleAssistant = async (e: FormEvent) => {
    e.preventDefault()
    if (!assistantMsg.trim() || assistantLoading) return
    setAssistantLoading(true)
    setAssistantReply('')
    try {
      const res = await fetch('/api/studio/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: assistantMsg.trim() }),
      })
      const data = await res.json()
      setAssistantReply(data.reply || 'No reply')
    } catch (err) {
      setAssistantReply('Assistant unavailable. Check serverless function.')
    } finally {
      setAssistantLoading(false)
    }
  }

  const handleTTS = async (e: FormEvent) => {
    e.preventDefault()
    if (!ttsText.trim() || ttsLoading) return
    setTtsLoading(true)
    try {
      const res = await fetch('/api/studio/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText.trim(), voice: ttsVoice }),
      })
      if (!res.ok) {
        const err = await res.json()
        setAssistantReply(err.error || 'TTS failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.play().catch(() => setAssistantReply('Could not play audio.'))
      }
    } catch (err) {
      setAssistantReply('TTS service unavailable.')
    } finally {
      setTtsLoading(false)
    }
  }

  return (
    <div className="tab-scroll">
      <div className="section-title">
        <h2>🎛 Royal Studio</h2>
        <span className="caption">Create, remix & voice</span>
      </div>

      {/* Beat Pads */}
      <div className="studio-pads">
        {tracks.slice(0, 8).map((t, i) => (
          <button
            key={t.id}
            className="studio-pad"
            style={{ background: t.cover }}
            onClick={() => onPlayTrack(t)}
            title={t.title}
          >
            <span className="pad-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="pad-title">{t.title.slice(0, 18)}</span>
          </button>
        ))}
      </div>

      <div className="studio-grid">
        {/* AI Assistant */}
        <div className="studio-panel">
          <h3>🤖 AI Mix Assistant</h3>
          <form onSubmit={handleAssistant} className="studio-chat-form">
            <input
              type="text"
              value={assistantMsg}
              onChange={(e) => setAssistantMsg(e.target.value)}
              placeholder="Ask for remix tips, key matching…"
              disabled={assistantLoading}
            />
            <button type="submit" disabled={assistantLoading}>
              {assistantLoading ? '…' : 'Send'}
            </button>
          </form>
          {assistantReply && <p className="studio-reply">{assistantReply}</p>}
        </div>

        {/* ElevenLabs TTS */}
        <div className="studio-panel">
          <h3>🗣 Voice Narration (ElevenLabs)</h3>
          <form onSubmit={handleTTS} className="studio-tts-form">
            <textarea
              rows={2}
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Enter narration text…"
              disabled={ttsLoading}
            />
            <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)}>
              {voices.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <button type="submit" disabled={ttsLoading}>
              {ttsLoading ? 'Generating…' : '🔊 Generate Voice'}
            </button>
          </form>
          <audio ref={audioRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}