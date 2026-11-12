import { useMemo, useState, type FormEvent } from 'react'
import type { Track } from '../data/music'
import type { MusicArtistProfileInput, PublicMusicArtistProfile } from '../lib/supabase'

interface ArtistDirectoryProps {
  profiles: PublicMusicArtistProfile[]
  tracks: Track[]
  onPlayTrack: (track: Track, queue: Track[]) => void
  followedArtists: Set<string>
  onToggleFollow: (artistName: string) => void
  currentUserId?: string
  onSaveProfile: (profileId: string | null, input: MusicArtistProfileInput) => Promise<{ id: string | null; error: string | null }>
}

function safeExternalUrl(value?: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export default function ArtistDirectory({ profiles, tracks, onPlayTrack, followedArtists, onToggleFollow, currentUserId, onSaveProfile }: ArtistDirectoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [draft, setDraft] = useState<MusicArtistProfileInput>({ name: '', bio: '', avatar: '🎤', tagline: '', vision: '', genre_focus: '', cta_label: '', cta_url: '', hero_image_url: '', press_kit_url: '', booking_email: '', socials: {} })
  const [socialsText, setSocialsText] = useState('{}')
  const selected = profiles.find((profile) => profile.id === selectedId) || null
  const artistTracks = useMemo(
    () => selected ? tracks.filter((track) => track.artistProfileId === selected.id) : [],
    [selected, tracks],
  )

  const startCreate = () => {
    setEditingProfileId(null)
    setDraft({ name: '', bio: '', avatar: '🎤', tagline: '', vision: '', genre_focus: '', cta_label: '', cta_url: '', hero_image_url: '', press_kit_url: '', booking_email: '', socials: {} })
    setSocialsText('{}')
    setEditorError('')
    setEditorOpen(true)
  }

  const startEdit = () => {
    if (!selected) return
    setEditingProfileId(selected.id)
    setDraft({
      name: selected.name, bio: selected.bio, avatar: selected.avatar,
      tagline: selected.tagline || '', vision: selected.vision || '',
      genre_focus: selected.genreFocus || '', cta_label: selected.ctaLabel || '',
      cta_url: selected.ctaUrl || '', hero_image_url: selected.heroImageUrl || '',
      press_kit_url: selected.pressKitUrl || '', booking_email: selected.bookingEmail || '',
      socials: selected.socials || {}, credits: selected.credits || [],
    })
    setSocialsText(JSON.stringify(selected.socials || {}, null, 2))
    setEditorError('')
    setEditorOpen(true)
  }

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSavingProfile(true)
    setEditorError('')
    let socials: Record<string, string>
    try {
      const parsed = JSON.parse(socialsText || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Social links must be a JSON object.')
      socials = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    } catch (cause) {
      setEditorError(cause instanceof Error ? cause.message : 'Invalid social links JSON.')
      setSavingProfile(false)
      return
    }
    const result = await onSaveProfile(editingProfileId, { ...draft, socials })
    setSavingProfile(false)
    if (result.error || !result.id) {
      setEditorError(result.error || 'Could not save artist profile.')
      return
    }
    setSelectedId(result.id)
    setEditorOpen(false)
  }

  const updateDraft = (key: keyof MusicArtistProfileInput, value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }))
  }

  const editor = editorOpen ? (
    <form className="artist-profile-editor" onSubmit={submitProfile}>
      <div className="section-title"><h2>{editingProfileId ? 'Edit artist profile' : 'Create artist profile'}</h2></div>
      <label>Artist name<input required maxLength={80} value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} /></label>
      <label>Short tagline<input maxLength={180} value={draft.tagline || ''} onChange={(event) => updateDraft('tagline', event.target.value)} /></label>
      <label>Biography<textarea rows={3} maxLength={2000} value={draft.bio || ''} onChange={(event) => updateDraft('bio', event.target.value)} /></label>
      <label>Artist vision<textarea rows={2} maxLength={1000} value={draft.vision || ''} onChange={(event) => updateDraft('vision', event.target.value)} /></label>
      <div className="artist-editor-grid">
        <label>Avatar / emoji<input maxLength={120} value={draft.avatar || ''} onChange={(event) => updateDraft('avatar', event.target.value)} /></label>
        <label>Genre focus<input maxLength={120} value={draft.genre_focus || ''} onChange={(event) => updateDraft('genre_focus', event.target.value)} /></label>
        <label>Hero image URL<input type="url" value={draft.hero_image_url || ''} onChange={(event) => updateDraft('hero_image_url', event.target.value)} /></label>
        <label>Press kit URL<input type="url" value={draft.press_kit_url || ''} onChange={(event) => updateDraft('press_kit_url', event.target.value)} /></label>
        <label>Booking email<input type="email" value={draft.booking_email || ''} onChange={(event) => updateDraft('booking_email', event.target.value)} /></label>
        <label>Call-to-action label<input maxLength={60} value={draft.cta_label || ''} onChange={(event) => updateDraft('cta_label', event.target.value)} /></label>
        <label>Call-to-action URL<input type="url" value={draft.cta_url || ''} onChange={(event) => updateDraft('cta_url', event.target.value)} /></label>
      </div>
      <label>Social links (JSON object)
        <textarea rows={3} value={socialsText} onChange={(event) => setSocialsText(event.target.value)} placeholder='{"spotify":"https://open.spotify.com/artist/..."}' />
      </label>
      {editorError && <p role="alert" className="music-comment-error">{editorError}</p>}
      <div className="artist-editor-actions">
        <button type="submit" disabled={savingProfile || !draft.name.trim()}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
        <button type="button" onClick={() => setEditorOpen(false)}>Cancel</button>
      </div>
    </form>
  ) : null

  if (selected) {
    const socials = Object.entries(selected.socials || {})
      .map(([label, value]) => ({ label, href: safeExternalUrl(value) }))
      .filter((item): item is { label: string; href: string } => Boolean(item.href))
    const cta = safeExternalUrl(selected.ctaUrl)
    const pressKit = safeExternalUrl(selected.pressKitUrl)

    return (
      <div className="tab-scroll artist-directory">
        <button className="back-btn" onClick={() => setSelectedId(null)}>← All Artists</button>
        <div className="artist-storefront">
          {selected.heroImageUrl && safeExternalUrl(selected.heroImageUrl) ? (
            <img src={selected.heroImageUrl} alt="" className="artist-storefront-hero" />
          ) : (
            <div className="artist-storefront-hero artist-storefront-placeholder">{selected.avatar}</div>
          )}
          <div className="artist-storefront-body">
            <div className="artist-storefront-name">
              <h1>{selected.name}</h1>
              {selected.verified && <span className="artist-verified">✓ Verified</span>}
            </div>
            {selected.tagline && <p className="artist-tagline">{selected.tagline}</p>}
            <p>{selected.bio || 'This artist has not added a biography yet.'}</p>
            {selected.vision && <p className="artist-vision">{selected.vision}</p>}
            <div className="artist-meta-line">
              {selected.genreFocus && <span>{selected.genreFocus}</span>}
              <span>{selected.followerCount.toLocaleString()} followers</span>
              <button type="button" className="artist-follow-button" onClick={() => onToggleFollow(selected.name)}>
                {followedArtists.has(selected.name) ? 'Following' : 'Follow artist'}
              </button>
            </div>
            {currentUserId === selected.userId && (
              <button type="button" className="artist-follow-button" onClick={startEdit}>Edit profile</button>
            )}
            <div className="artist-socials">
              {socials.map((item) => (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a>
              ))}
              {pressKit && <a href={pressKit} target="_blank" rel="noopener noreferrer">Press kit</a>}
              {selected.bookingEmail && <a href={`mailto:${selected.bookingEmail}`}>Booking</a>}
              {cta && <a className="artist-cta" href={cta} target="_blank" rel="noopener noreferrer">{selected.ctaLabel || 'Visit artist link'}</a>}
            </div>
          </div>
        </div>
        {editor}
        <section>
          <div className="section-title"><h2>Releases</h2><span>{artistTracks.length} tracks</span></div>
          {artistTracks.length ? (
            <div className="track-list-compact">
              {artistTracks.map((track) => (
                <button key={track.id} className="track-row-compact artist-track-row" onClick={() => onPlayTrack(track, artistTracks)}>
                  <div className="mini-cover" style={{ background: track.cover }} />
                  <div className="track-meta"><strong>{track.title}</strong><span>{track.artist}</span></div>
                  <span className="like-count">▶</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="empty">No releases are currently linked to this artist profile.</p>
          )}
        </section>
        {selected.credits.length > 0 && (
          <section>
            <div className="section-title"><h2>Credits</h2></div>
            <div className="artist-credits">
              {selected.credits.map((credit, index) => {
                const href = safeExternalUrl(credit.url)
                return (
                  <div key={`${credit.title}-${index}`}>
                    <strong>{credit.title}</strong><span>{credit.role}{credit.artist ? ` · ${credit.artist}` : ''}</span>
                    {href && <a href={href} target="_blank" rel="noopener noreferrer">View</a>}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div className="tab-scroll artist-directory">
      <div className="section-title">
        <h2>Artist Directory</h2>
        <span>{profiles.length} profiles</span>
      </div>
      {currentUserId && !editorOpen && <button type="button" className="artist-follow-button" onClick={startCreate}>＋ Create artist profile</button>}
      {editor}
      {profiles.length === 0 ? (
        <div className="empty">No public artist profiles are available yet.</div>
      ) : (
        <div className="artist-directory-grid">
          {profiles.map((profile) => (
            <button key={profile.id} className="artist-directory-card" onClick={() => setSelectedId(profile.id)}>
              {profile.heroImageUrl && safeExternalUrl(profile.heroImageUrl) ? (
                <img src={profile.heroImageUrl} alt="" />
              ) : (
                <span className="artist-directory-avatar">{profile.avatar}</span>
              )}
              <span className="artist-directory-card-name">
                {profile.name} {profile.verified ? <span className="artist-verified">✓</span> : null}
              </span>
              <span className="artist-directory-card-tagline">{profile.tagline || profile.genreFocus || profile.bio || 'Artist profile'}</span>
              <span className="artist-directory-followers">{profile.followerCount.toLocaleString()} followers</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
