import React, { useEffect, useState } from 'react'
import './UploadModal.css'
import type { User } from '@supabase/supabase-js'
import type { Track } from '../data/music'
import { fetchOwnedArtistProfiles, saveArtistProfile, type MusicArtistProfileOption } from '../lib/supabase'
import { uploadMusicRelease } from '../lib/musicUpload'
import { assertReleaseAvailable, hashAudioFile, registerUploadedRelease, rollbackUnregisteredUpload } from '../lib/releaseRegistry'

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onTrackUploaded: (track: Track) => void
  onOpenAuth: () => void
}

const GENRES = ['Afrobeats', 'Afropop', 'Highlife', 'Hiplife', 'Hip-Hop', 'R&B', 'Gospel', 'Dancehall', 'Amapiano', 'Reggae', 'Electronic', 'Jazz', 'Classical', 'Other']
const MOODS = ['Energetic', 'Happy', 'Chill', 'Romantic', 'Melancholic', 'Inspirational', 'Spiritual', 'Aggressive', 'Focus', 'Party', 'Other']
const STAGES = ['Preparing release', 'Uploading audio', 'Uploading artwork', 'Publishing metadata', 'Published']

export default function UploadModal({ isOpen, onClose, user, onTrackUploaded, onOpenAuth }: UploadModalProps) {
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [artistProfiles, setArtistProfiles] = useState<MusicArtistProfileOption[]>([])
  const [artistProfileId, setArtistProfileId] = useState('')
  const [newArtistName, setNewArtistName] = useState('')
  const [album, setAlbum] = useState('')
  const [genre, setGenre] = useState(GENRES[0])
  const [mood, setMood] = useState(MOODS[0])
  const [credits, setCredits] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [monetizationEnabled, setMonetizationEnabled] = useState(false)
  const [isPaidSound, setIsPaidSound] = useState(false)
  const [paidSoundPrice, setPaidSoundPrice] = useState('5.00')
  const [paidSoundDescription, setPaidSoundDescription] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen || !user) {
      setArtistProfiles([])
      setArtistProfileId('')
      return
    }
    let cancelled = false
    void fetchOwnedArtistProfiles(user.id).then((profiles) => {
      if (cancelled) return
      setArtistProfiles(profiles)
      setArtistProfileId((current) => current && profiles.some((p) => p.id === current) ? current : profiles[0]?.id || '')
      if (!artist.trim() && profiles[0]) setArtist(profiles[0].name)
    })
    return () => { cancelled = true }
  }, [isOpen, user?.id])

  if (!isOpen) return null

  const reset = () => {
    setTitle(''); setArtist(''); setArtistProfileId(''); setNewArtistName(''); setAlbum('')
    setGenre(GENRES[0]); setMood(MOODS[0]); setCredits(''); setLyrics('')
    setMonetizationEnabled(false); setIsPaidSound(false); setPaidSoundPrice('5.00'); setPaidSoundDescription(''); setAudioFile(null); setCoverFile(null)
    setStage(0); setErrorMsg(''); setNotice('')
  }

  const handleCreateArtist = async () => {
    if (!user) { onOpenAuth(); return }
    const name = newArtistName.trim()
    if (!name) { setErrorMsg('Enter an artist profile name first.'); return }
    setErrorMsg('')
    const result = await saveArtistProfile(null, { name })
    if (result.error || !result.id) {
      setErrorMsg(result.error || 'Artist profile could not be created.')
      return
    }
    const profiles = await fetchOwnedArtistProfiles(user.id)
    setArtistProfiles(profiles)
    setArtistProfileId(result.id)
    setArtist(name)
    setNewArtistName('')
    setNotice('Artist profile created and linked to your account.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) { onOpenAuth(); return }
    if (!audioFile) { setErrorMsg('Choose an audio file before publishing.'); return }
    if (!title.trim()) { setErrorMsg('Track title is required.'); return }
    if (!artist.trim() && !artistProfileId) { setErrorMsg('Choose an artist profile or enter an artist name.'); return }
    if (isPaidSound && (!Number.isFinite(Number(paidSoundPrice)) || Number(paidSoundPrice) <= 0)) { setErrorMsg('Enter a paid-sound price greater than zero.'); return }

    setLoading(true); setStage(0); setErrorMsg(''); setNotice('')
    let uploadedTrack: Track | null = null
    try {
      const contentHash = await hashAudioFile(audioFile)
      await assertReleaseAvailable(contentHash)
      uploadedTrack = await uploadMusicRelease({
        title: title.trim(), artist: artist.trim(), album: album.trim() || 'Singles',
        genre, mood, productionCredits: credits, lyrics, monetizationEnabled,
        isPaidSound, paidSoundPriceGhs: isPaidSound ? Number(paidSoundPrice) : undefined,
        paidSoundDescription, artistProfileId: artistProfileId || null, audioContentHash: contentHash,
      }, audioFile, coverFile, (nextStage) => {
        const index = ({ preparing: 0, audio: 1, artwork: 2, publishing: 3, complete: 4 } as const)[nextStage]
        setStage(index)
      })
      try {
        await registerUploadedRelease(contentHash, uploadedTrack, user.id)
      } catch (registrationError) {
        await rollbackUnregisteredUpload(uploadedTrack, user.id)
        uploadedTrack = null
        throw registrationError
      }
      setStage(4)
      onTrackUploaded(uploadedTrack)
      reset()
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'The release could not be published.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={() => { if (!loading) onClose() }}>
      <div className="modal-card upload-card upload-card--page" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="logo-mark small">♫</div>
          <div><h2>Publish a release</h2><p className="upload-subtitle">Creator publishing · shared SCN music catalogue</p></div>
          <button className="close-btn" type="button" onClick={onClose} disabled={loading} aria-label="Close upload">✕</button>
        </div>
        {!user ? (
          <div className="auth-required-box">
            <p>Sign in to publish music to your artist profile and the shared music catalogue.</p>
            <button className="submit-btn" onClick={() => { onClose(); onOpenAuth() }}>Sign in to continue</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form upload-form">
            <ol className="upload-stage-list" aria-label="Publishing stages">
              {STAGES.map((label, index) => <li key={label} className={index < stage ? 'is-complete' : index === stage ? 'is-current' : ''}><span>{index < stage ? '✓' : index + 1}</span>{label}</li>)}
            </ol>
            {errorMsg && <div className="alert error" role="alert">{errorMsg}</div>}
            {notice && <div className="alert success" role="status">{notice}</div>}
            <section className="upload-section">
              <h3>Release details</h3>
              <div className="form-group"><label htmlFor="upload-title">Track title *</label><input id="upload-title" required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the track title" /></div>
              <div className="form-group"><label htmlFor="upload-artist">Artist name</label><input id="upload-artist" maxLength={100} value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist or stage name" /></div>
              <div className="form-group">
                <label htmlFor="upload-artist-profile">Publish under artist profile</label>
                <select id="upload-artist-profile" value={artistProfileId} onChange={(e) => { const id = e.target.value; setArtistProfileId(id); const selected = artistProfiles.find((p) => p.id === id); if (selected) setArtist(selected.name) }}>
                  <option value="">Use artist name above</option>{artistProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </div>
              <div className="form-row"><div className="form-group"><label htmlFor="new-artist-profile">Create artist profile</label><input id="new-artist-profile" value={newArtistName} onChange={(e) => setNewArtistName(e.target.value)} placeholder="New artist name" maxLength={80} /></div><button className="upload-secondary-btn" type="button" onClick={() => void handleCreateArtist()} disabled={loading}>Add profile</button></div>
              <div className="form-group"><label htmlFor="upload-album">Album / collection</label><input id="upload-album" value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="Singles or collection name" maxLength={120} /></div>
              <div className="form-row">
                <div className="form-group"><label htmlFor="upload-genre">Genre</label><select id="upload-genre" value={genre} onChange={(e) => setGenre(e.target.value)}>{GENRES.map((item) => <option key={item}>{item}</option>)}</select></div>
                <div className="form-group"><label htmlFor="upload-mood">Mood</label><select id="upload-mood" value={mood} onChange={(e) => setMood(e.target.value)}>{MOODS.map((item) => <option key={item}>{item}</option>)}</select></div>
              </div>
            </section>
            <section className="upload-section">
              <h3>Production & lyrics</h3>
              <div className="form-group"><label htmlFor="upload-credits">Production credits</label><input id="upload-credits" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="Produced by, mixed by, mastered by…" maxLength={1000} /></div>
              <div className="form-group"><label htmlFor="upload-lyrics">Lyrics <span className="upload-muted">(optional)</span></label><textarea id="upload-lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Add lyrics or liner notes…" rows={5} maxLength={20000} /></div>
            </section>
            <section className="upload-section">
              <h3>Audio & artwork</h3>
              <div className="form-group"><label htmlFor="upload-audio">Audio file *</label><input id="upload-audio" type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" required onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />{audioFile && <p className="upload-muted">{audioFile.name} · {(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>}</div>
              <div className="form-group"><label htmlFor="upload-cover">Cover artwork</label><input id="upload-cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />{coverFile && <p className="upload-muted">{coverFile.name}</p>}</div>
            </section>
            <section className="upload-section">
              <h3>Royalty eligibility</h3>
              <label className="upload-check-row"><input type="checkbox" checked={monetizationEnabled} onChange={(e) => setMonetizationEnabled(e.target.checked)} /><span><strong>Enable verified-stream royalty eligibility</strong><small>Only qualifying, server-recorded streams can accrue royalties. No rate is active until the platform publishes one.</small></span></label>
              <label className="upload-check-row"><input type="checkbox" checked={isPaidSound} onChange={(e) => setIsPaidSound(e.target.checked)} /><span><strong>List this as a paid sound</strong><small>Stores your intended license price and description. No payment or license is created until checkout is connected.</small></span></label>
              {isPaidSound && <div className="form-group"><label htmlFor="upload-paid-price">License price (GHS)</label><input id="upload-paid-price" type="number" min="0.5" step="0.5" value={paidSoundPrice} onChange={(e) => setPaidSoundPrice(e.target.value)} /><label htmlFor="upload-paid-description">License description</label><input id="upload-paid-description" value={paidSoundDescription} onChange={(e) => setPaidSoundDescription(e.target.value)} placeholder="Usage rights and license notes…" maxLength={1000} /></div>}
              <div className="upload-info-note">Paid-sound checkout is not enabled yet. This saves listing preferences only. A real merchant account, verified payment webhook, and license-issuance flow are required before anyone can buy or use a paid license.</div>
            </section>
            <div className="upload-footer"><button type="button" className="upload-secondary-btn" onClick={onClose} disabled={loading}>Cancel</button><button type="submit" className="submit-btn" disabled={loading}>{loading ? STAGES[stage] || 'Publishing…' : 'Publish release'}</button></div>
          </form>
        )}
      </div>
    </div>
  )
}
