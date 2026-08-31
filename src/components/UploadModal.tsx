import { useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { uploadTrackToBucket } from '../lib/supabase'
import { Track } from '../data/music'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onTrackUploaded: (track: Track) => void
  onOpenAuth: () => void
}

export default function UploadModal({
  isOpen,
  onClose,
  user,
  onTrackUploaded,
  onOpenAuth,
}: UploadModalProps) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [album, setAlbum] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const audioInputRef = useRef<HTMLInputElement | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      onOpenAuth()
      return
    }

    if (!audioFile) {
      setErrorMsg('Please select an audio file (MP3, WAV, FLAC, M4A).')
      return
    }

    if (!title.trim()) {
      setErrorMsg('Track title is required.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const track = await uploadTrackToBucket({
        title: title.trim(),
        artist: artist.trim() || user.user_metadata?.username || 'Kus-lords Artist',
        album: album.trim() || 'Singles Cloud',
        audioFile,
        coverFile,
        user,
      })

      if (track) {
        onTrackUploaded(track)
        onClose()
        setTitle('')
        setArtist('')
        setAlbum('')
        setAudioFile(null)
        setCoverFile(null)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload track.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card upload-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="logo-mark small">☁</div>
          <h2>Upload to Music Bucket</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {!user ? (
          <div className="auth-required-box">
            <p>You must be signed into your Kus-lords account to upload tracks to Supabase Storage & Database.</p>
            <button
              className="submit-btn"
              onClick={() => {
                onClose()
                onOpenAuth()
              }}
            >
              Sign In to Continue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {errorMsg && <div className="alert error">{errorMsg}</div>}

            <div className="form-group">
              <label>Track Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Royal High Tide"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Artist Name</label>
              <input
                type="text"
                placeholder={user.user_metadata?.username || 'Artist Name'}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Album / Collection</label>
              <input
                type="text"
                placeholder="e.g. Golden Era"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Audio File (.mp3, .wav) *</label>
                <input
                  type="file"
                  accept="audio/*"
                  ref={audioInputRef}
                  required
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="form-group">
                <label>Cover Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={coverInputRef}
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Uploading to Bucket...' : 'Upload & Publish Track'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}