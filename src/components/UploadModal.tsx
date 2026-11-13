import React, { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { fetchOwnedArtistProfiles, uploadTrackToBucket, type MusicArtistProfileOption } from '../lib/supabase'
import { Track } from '../data/music'
import { assertReleaseAvailable, hashAudioFile, registerUploadedRelease, rollbackUnregisteredUpload } from '../lib/releaseRegistry'

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
  const [artistProfiles, setArtistProfiles] = useState<MusicArtistProfileOption[]>([])
  const [artistProfileId, setArtistProfileId] = useState('')
  const [album, setAlbum] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!isOpen || !user) {
      setArtistProfiles([])
      setArtistProfileId('')
      return
    }
    let cancelled = false
    fetchOwnedArtistProfiles(user.id).then((profiles) => {
      if (cancelled) return
      setArtistProfiles(profiles)
      setArtistProfileId((current) =>
        current && profiles.some((profile) => profile.id === current)
          ? current
          : profiles[0]?.id || ''
      )
    })
    return () => { cancelled = true }
  }, [isOpen, user?.id])

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
      const artistName = artist.trim() || String(
        user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || ''
      ).trim()
      if (!artistName) throw new Error('Add an artist name before publishing this release.')

      // Match SCN's content-hash release registry. Check before upload, then
      // insert the registry row under the authenticated owner after publishing.
      const contentHash = await hashAudioFile(audioFile)
      await assertReleaseAvailable(contentHash)
      const track = await uploadTrackToBucket({
        title: title.trim(),
        artist: artistName,
        album: album.trim() || 'Singles',
        audioFile,
        coverFile,
        user,
        artistProfileId: artistProfileId || null,
        audioContentHash: contentHash,
      })

      try {
        await registerUploadedRelease(contentHash, track, user.id)
      } catch (registrationError) {
        await rollbackUnregisteredUpload(track, user.id)
        throw registrationError
      }

      onTrackUploaded(track)
      onClose()
      setTitle('')
      setArtist('')
      setAlbum('')
      setAudioFile(null)
      setCoverFile(null)
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
                placeholder={user.user_metadata?.username || user.email?.split('@')[0] || 'Artist name'}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
            </div>

            {artistProfiles.length > 0 && (
              <div className="form-group">
                <label>Publish under artist profile</label>
                <select
                  value={artistProfileId}
                  onChange={(e) => setArtistProfileId(e.target.value)}
                >
                  {artistProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Album / Collection</label>
              <input
                type="text"
                placeholder="Optional collection name"
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
                  required
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="form-group">
                <label>Cover Image (optional)</label>
                <input
                  type="file"
                  accept="image/*"
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