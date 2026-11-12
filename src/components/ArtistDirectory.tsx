import { useMemo, useState } from 'react'
import type { Track } from '../data/music'
import type { PublicMusicArtistProfile } from '../lib/supabase'

interface ArtistDirectoryProps {
  profiles: PublicMusicArtistProfile[]
  tracks: Track[]
  onPlayTrack: (track: Track, queue: Track[]) => void
  followedArtists: Set<string>
  onToggleFollow: (artistName: string) => void
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

export default function ArtistDirectory({ profiles, tracks, onPlayTrack, followedArtists, onToggleFollow }: ArtistDirectoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = profiles.find((profile) => profile.id === selectedId) || null
  const artistTracks = useMemo(
    () => selected ? tracks.filter((track) => track.artistProfileId === selected.id) : [],
    [selected, tracks],
  )

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
