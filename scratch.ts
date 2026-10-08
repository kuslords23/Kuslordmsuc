import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

// ===== TYPES & INTERFACES =====
interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  audioUrl: string
  cover: string
  genre?: string
  isSportsAnthem?: boolean
  matchVibe?: string
  likes?: number
  explicit?: boolean
  contributors?: string[]
}

interface Album {
  id: string
  title: string
  artist: string
  description: string
  cover: string
  category: 'royals' | 'sports' | 'vibes' | 'chill' | 'afro' | 'hiphop'
  tracks: Track[]
}

interface RadioStation {
  id: string
  name: string
  genre: string
  color: string
  icon: string
  host?: string
  isLive?: boolean
}

interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  tier: 'Free' | 'Premium' | 'Family'
}

// ===== DESIGN TOKENS =====
const colors = {
  bg: '#0a0a0f',
  bg2: '#14141c',
  card: '#1e1e2a',
  cardHover: '#282838',
  text: '#f5f5f7',
  muted: '#8a8e9e',
  accent: '#fa2d6c',
  accent2: '#fc6f60',
  gold: '#d4af37',
  green: '#2ecc71',
  blue: '#00c9ff',
  purple: '#7b2fff',
}

const gradients = {
  pinkPurple: 'linear-gradient(135deg, #f857a6, #614ad2)',
  goldOrange: 'linear-gradient(135deg, #f5af19, #e65c00)',
  tealGreen: 'linear-gradient(135deg, #11998e, #38ef7d)',
  bluePurple: 'linear-gradient(135deg, #00c9ff, #7b2fff)',
  warm: 'linear-gradient(135deg, #e6c656, #f37335)',
  redYellow: 'linear-gradient(135deg, #ff6b6b, #c5a059)',
  navy: 'linear-gradient(135deg, #1e3c72, #2a5298)',
}

// ===== SAMPLE DATA =====
const sampleTracks: Track[] = [
  { id: '1', title: 'Midnight Highway Drive', artist: 'Neon Coast', album: 'Midnight Highway', duration: 368, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', cover: gradients.pinkPurple, genre: 'Synthwave', likes: 640, explicit: false },
  { id: '2', title: 'Royal Crown Serenade', artist: 'The Velvet Shores', album: 'Coastal Lights', duration: 412, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', cover: gradients.goldOrange, genre: 'Afro Chill', likes: 830, explicit: false },
  { id: '3', title: 'Glass Waves & Aurora', artist: 'Polar Nights', album: 'Aurora', duration: 291, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', cover: gradients.bluePurple, genre: 'Ambient', likes: 540, explicit: false },
  { id: '4', title: 'Lagos to Accra Grooves', artist: 'Kus-Lords Allstars', album: 'Royal Afro Beats', duration: 254, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', cover: gradients.tealGreen, genre: 'Afrobeats', likes: 1530, explicit: false, contributors: ['Kus-Lords Allstars', 'Guest Vocalist'] },
  { id: '5', title: 'Vapor Run Horizon', artist: 'Chrome Pulse', album: 'Midnight Highway', duration: 356, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', cover: 'linear-gradient(135deg, #7f5fff, #ff7fff)', genre: 'Synthwave', likes: 670, explicit: false },
  { id: '6', title: 'Pacific St. Drift', artist: 'Lush Coast', album: 'Pacific Waves', duration: 402, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', cover: gradients.navy, genre: 'Deep House', likes: 710, explicit: false },
  { id: '7', title: 'Silk City Skyline', artist: 'Marble Sky', album: 'Neo Tokyo', duration: 335, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', cover: gradients.warm, genre: 'Lo-Fi', likes: 420, explicit: false },
  { id: '8', title: 'Kuslords Golden Anthem', artist: 'Clan Nexus Symphony', album: 'Nexus Sovereign', duration: 315, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', cover: gradients.warm, genre: 'Royal Anthem', likes: 2100, explicit: false },
  { id: '9', title: 'Explicit Content Demo', artist: 'Dark Wave', album: 'Underground', duration: 280, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', cover: gradients.redYellow, genre: 'Industrial', likes: 320, explicit: true },
  { id: '10', title: 'Champions Arena Anthem', artist: 'Royal Kus-Lords Brass', album: 'Matchday Stadium', duration: 310, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', cover: gradients.goldOrange, genre: 'Stadium Anthem', likes: 1420, explicit: false },
]

const sampleAlbums: Album[] = [
  { id: 'a1', title: 'Midnight Highway', artist: 'Neon Coast', description: 'Late night synthwave for city drives', cover: gradients.pinkPurple, category: 'vibes', tracks: [sampleTracks[0], sampleTracks[4], sampleTracks[6]] },
  { id: 'a2', title: 'Royal Afro Beats', artist: 'Kus-Lords Allstars', description: 'High energy African rhythms', cover: gradients.tealGreen, category: 'afro', tracks: [sampleTracks[3], sampleTracks[1], sampleTracks[5]] },
  { id: 'a3', title: 'Nexus Sovereign', artist: 'Clan Nexus Symphony', description: 'Royal lifestyle collection', cover: gradients.warm, category: 'royals', tracks: [sampleTracks[7], sampleTracks[0], sampleTracks[1], sampleTracks[3]] },
  { id: 'a4', title: 'Aurora Chill', artist: 'Polar Nights', description: 'Ambient meditative soundscapes', cover: gradients.bluePurple, category: 'chill', tracks: [sampleTracks[2], sampleTracks[5], sampleTracks[6]] },
  { id: 'a5', title: 'Stadium Anthems', artist: 'Sports Clan', description: 'Walkout and celebration tracks', cover: gradients.redYellow, category: 'sports', tracks: [sampleTracks[9], sampleTracks[7]] },
  { id: 'a6', title: 'Hip-Hop Editorial', artist: 'Various Artists', description: 'Curated rap and hip-hop', cover: gradients.navy, category: 'hiphop', tracks: [sampleTracks[8], sampleTracks[3], sampleTracks[0]] },
]

const radioStations: RadioStation[] = [
  { id: 'r1', name: 'Focus Flow', genre: 'Ambient / Lo-Fi', color: gradients.bluePurple, icon: '🎯', host: 'Auto-DJ', isLive: false },
  { id: 'r2', name: 'Motivation Mix', genre: 'High Energy', color: gradients.pinkPurple, icon: '🔥', host: 'Zane Lowe', isLive: true },
  { id: 'r3', name: 'Oldies Gold', genre: 'Classic Hits', color: gradients.goldOrange, icon: '🎶', host: 'Auto-DJ', isLive: false },
  { id: 'r4', name: 'Reggae Vibe', genre: 'Island Rhythms', color: gradients.tealGreen, icon: '🌴', host: 'Auto-DJ', isLive: false },
  { id: 'r5', name: 'Metal Mayhem', genre: 'Heavy Rock', color: gradients.redYellow, icon: '⚡', host: 'Auto-DJ', isLive: false },
  { id: 'r6', name: 'Afro Grooves', genre: 'Afrobeats', color: gradients.warm, icon: '🌍', host: 'Auto-DJ', isLive: false },
]

// ===== STYLED COMPONENTS =====
const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const ExplicitBadge: React.FC = () => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    marginLeft: 4,
    flexShrink: 0,
  }}>E</span>
)

const GenreChip: React.FC<{ genre: string; onClick?: () => void }> = ({ genre, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: colors.card,
      border: `1px solid rgba(255,255,255,0.08)`,
      color: colors.text,
      padding: '7px 16px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      cursor: 'pointer',
      transition: 'all 0.15s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = colors.accent }}
    onMouseLeave={(e) => { e.currentTarget.style.background = colors.card }}
  >{genre}</button>
)

// ===== BOTTOM NAVIGATION =====
type Tab = 'home' | 'browse' | 'radio' | 'library' | 'search'

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'browse', label: 'New', icon: '🆕' },
    { id: 'radio', label: 'Radio', icon: '📻' },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'search', label: 'Search', icon: '⌕' },
  ]

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: 'rgba(9,9,14,0.95)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 100,
      padding: '0 4px',
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '6px 12px',
              borderRadius: 12,
              flex: 1,
              color: isActive ? colors.accent : colors.muted,
              transition: 'all 0.2s',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: 20,
              filter: isActive ? 'drop-shadow(0 0 8px rgba(250,45,108,0.6))' : 'none',
            }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// ===== MINI PLAYER =====
interface MiniPlayerProps {
  track: Track | null
  isPlaying: boolean
  onTogglePlay: () => void
  onExpand: () => void
  onNext: () => void
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ track, isPlaying, onTogglePlay, onExpand, onNext }) => {
  if (!track) return null

  return (
    <div
      onClick={onExpand}
      style={{
        position: 'fixed',
        bottom: 64,
        left: 0,
        right: 0,
        height: 60,
        background: 'rgba(18,18,26,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        zIndex: 90,
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 8,
          background: track.cover,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>{isPlaying ? '♪' : ''}</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <strong style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</strong>
        <span style={{ fontSize: 11, color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          border: 'none',
          cursor: 'pointer',
        }}
      >{isPlaying ? '❚❚' : '▶'}</button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext() }}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          border: 'none',
          cursor: 'pointer',
        }}
      >⏭</button>
    </div>
  )
}

// ===== FULL SCREEN PLAYER =====
interface FullPlayerProps {
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  onTogglePlay: () => void
  onSeek: (time: number) => void
  onVolume: (v: number) => void
  onCollapse: () => void
  onNext: () => void
  onPrev: () => void
}

const FullPlayer: React.FC<FullPlayerProps> = ({ track, isPlaying, currentTime, duration, volume, onTogglePlay, onSeek, onVolume, onCollapse, onNext, onPrev }) => {
  if (!track) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      animation: 'slideUp 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%) }
          to { transform: translateY(0) }
        }
      `}</style>

      {/* Background artwork blur */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          filter: 'blur(80px) brightness(0.3)',
          transform: 'scale(1.2)',
          background: track.cover,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px 32px' }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={onCollapse}
            style={{ fontSize: 20, color: colors.muted, padding: 8, border: 'none', background: 'none', cursor: 'pointer' }}
          >▼</button>
          <span style={{ fontSize: 10, letterSpacing: 2, color: colors.gold, fontWeight: 700 }}>NOW PLAYING</span>
          <button style={{ fontSize: 20, color: colors.muted, padding: 8, border: 'none', background: 'none', cursor: 'pointer' }}>☰</button>
        </div>

        {/* Artwork */}
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 20,
            margin: '0 auto 24px',
            background: track.cover,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), transparent)',
          }} />
        </div>

        {/* Track info */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{track.title}</h2>
          <p style={{ color: colors.muted, fontSize: 14, marginBottom: 8 }}>{track.artist}</p>
          {track.explicit && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>EXPLICIT</span>}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            style={{ width: '100%', accentColor: colors.accent, height: 4, cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.muted, marginTop: 6 }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 20 }}>
          <button onClick={onPrev} style={{ fontSize: 24, color: colors.muted, border: 'none', background: 'none', cursor: 'pointer' }}>⏮</button>
          <button
            onClick={onTogglePlay}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: colors.text,
              color: colors.bg,
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(250,45,108,0.3)',
              border: 'none',
              cursor: 'pointer',
            }}
          >{isPlaying ? '❚❚' : '▶'}</button>
          <button onClick={onNext} style={{ fontSize: 24, color: colors.muted, border: 'none', background: 'none', cursor: 'pointer' }}>⏭</button>
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span>🔊</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            style={{ flex: 1, accentColor: colors.accent, height: 3 }}
          />
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: colors.muted }}>
          <span>Audio Output: Device Speakers</span>
        </div>
      </div>
    </div>
  )
}

// ===== HOME TAB =====
interface HomeTabProps {
  albums: Album[]
  onPlayAlbum: (album: Album) => void
  onSelectAlbum: (album: Album) => void
  onPlayTrack: (track: Track, list: Track[]) => void
}

const HomeTab: React.FC<HomeTabProps> = ({ albums, onPlayAlbum, onSelectAlbum, onPlayTrack }) => {
  const featured = albums.slice(0, 3)

  return (
    <div style={{ padding: '16px 16px 24px', minHeight: '100%' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(250,45,108,0.25), rgba(212,175,55,0.18))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '28px 24px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <span style={{ display: 'block', fontSize: 11, letterSpacing: 2, color: colors.gold, fontWeight: 700, marginBottom: 10 }}>👑 KUS-LORDS ROYAL SOUND</span>
        <h1 style={{ fontSize: 26, lineHeight: 1.15, marginBottom: 10, letterSpacing: -0.5 }}>Discover the feeling of infinite sound.</h1>
        <p style={{ color: colors.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>Stream high-fidelity tracks, access your cloud vault, and curate playlists.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => { const t = albums[0]; if (t?.tracks.length) onPlayTrack(t.tracks[0], t.tracks) }}
            style={{ background: colors.text, color: colors.bg, padding: '10px 20px', borderRadius: 20, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
          >▶ Listen Now</button>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: colors.text, padding: '10px 18px', borderRadius: 20, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>☁ Upload</button>
        </div>
      </div>

      {/* Featured Albums */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>Featured Royal Albums</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s', background: colors.card, padding: 10, borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = colors.cardHover }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = colors.card }}
            >
              <div style={{ aspectRatio: 1, borderRadius: 10, position: 'relative', overflow: 'hidden', marginBottom: 10, background: album.cover, boxShadow: '0 6px 18px rgba(0,0,0,0.5)' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); onPlayAlbum(album) }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: colors.text, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▶</span>
                </div>
                <span style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '2px 7px', borderRadius: 10, fontSize: 10 }}>
                  {album.category === 'sports' ? '⚡ STADIUM' : `${album.tracks.length} Songs`}
                </span>
              </div>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</strong>
              <span style={{ fontSize: 11, color: colors.muted }}>{album.artist}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Made For You */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>Made For You</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          {albums.slice(3).map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s', background: colors.card, padding: 10, borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = colors.cardHover }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = colors.card }}
            >
              <div style={{ aspectRatio: 1, borderRadius: 10, position: 'relative', overflow: 'hidden', marginBottom: 10, background: album.cover, boxShadow: '0 6px 18px rgba(0,0,0,0.5)' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); onPlayAlbum(album) }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: colors.text, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▶</span>
                </div>
              </div>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</strong>
              <span style={{ fontSize: 11, color: colors.muted }}>{album.artist}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== BROWSE TAB =====
const BrowseTab: React.FC<{ albums: Album[]; onPlayAlbum: (a: Album) => void; onSelectAlbum: (a: Album) => void }> = ({ albums, onPlayAlbum, onSelectAlbum }) => {
  const genres = ['Synthwave', 'Afrobeats', 'Ambient', 'Stadium', 'Lo-Fi', 'Deep House', 'Hip-Hop', 'Rock']

  return (
    <div style={{ padding: '16px 16px 24px', minHeight: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>Browse & New Releases</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBountry: 12, marginBottom: 16, WebkitOverflowScrolling: 'touch' }}>
          {genres.map((g) => (
            <GenreChip key={g} genre={g} />
          ))}
        </div>
      </div>

      {/* Editorial Hip-Hop/Rap board */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>Hip-Hop / Rap Editorial</h2>
        </div>
        <div
          onClick={() => onSelectAlbum(albums.find(a => a.category === 'hiphop')!)}
          style={{
            background: gradients.navy,
            borderRadius: 16,
            padding: 20,
            marginBottom: 12,
            position: 'relative',
            overflow: 'hidden',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'block', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 6 }}>EDITORIAL PICK</span>
            <h3 style={{ fontSize: 20, marginBottom: 4, color: '#fff' }}>Curated Hip-Hop</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 12 }}>12 New Releases This Week</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); onPlayAlbum(albums.find(a => a.category === 'hiphop')!) }} style={{ background: colors.text, color: colors.bg, padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>▶ Play</button>
              <button onClick={(e) => { e.stopPropagation() }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '8px 16px', borderRadius: 20, fontWeight: 600, fontSize: 12, border: 'none', cursor: 'pointer' }}> Shuffle</button>
            </div>
          </div>
          <div style={{ fontSize: 60, opacity: 0.3, zIndex: 1 }}>🎵</div>
        </div>
      </div>

      {/* New Albums Grid */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>New Albums</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s', background: colors.card, padding: 10, borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = colors.cardHover }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = colors.card }}
            >
              <div style={{ aspectRatio: 1, borderRadius: 10, position: 'relative', overflow: 'hidden', marginBottom: 10, background: album.cover, boxShadow: '0 6px 18px rgba(0,0,0,0.5)' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); onPlayAlbum(album) }}
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s' }}
                >
                  <span style={{ width: 38, height: 38, borderRadius: '50%', background: colors.text, color: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>▶</span>
                </div>
              </div>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</strong>
              <span style={{ fontSize: 11, color: colors.muted }}>{album.artist}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== RADIO TAB =====
const RadioTab: React.FC<{ tracks: Track[]; onPlayTrack: (t: Track, list: Track[]) => void }> = ({ tracks, onPlayTrack }) => {
  return (
    <div style={{ padding: '16px 16px 24px', minHeight: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>🎙 Radio & Live Stations</h2>
          <span style={{ fontSize: 11, color: colors.muted }}>● 4 LIVE</span>
        </div>

        {/* Live station banner */}
        <div
          style={{
            background: gradients.pinkPurple,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'block', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginBottom: 4 }}>LIVE NOW</span>
            <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 2 }}>Motivation Mix</h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginBottom: 8 }}>Host: Zane Lowe • High Energy</p>
            <button
              onClick={() => { const t = tracks.find(t => t.genre?.includes('High')) || tracks[0]; onPlayTrack(t, tracks) }}
              style={{ background: colors.text, color: colors.bg, padding: '8px 18px', borderRadius: 20, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
            >▶ Listen Live</button>
          </div>
          <div style={{ fontSize: 48, opacity: 0.4, position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>🔥</div>
        </div>

        {/* Genre grid tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {radioStations.map((station) => (
            <div
              key={station.id}
              onClick={() => { const t = tracks.find(t => t.genre?.toLowerCase().includes(station.genre.split(' ')[0].toLowerCase())) || tracks[0]; onPlayTrack(t, tracks) }}
              style={{
                background: station.color,
                borderRadius: 14,
                padding: 16,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 100,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {station.isLive && (
                <span style={{ position: 'absolute', top: 8, right: 8, color: '#ff4444', fontSize: 10, animation: 'pulse 1.5s infinite' }}>●</span>
              )}
              <span style={{ fontSize: 24 }}>{station.icon}</span>
              <div>
                <strong style={{ display: 'block', fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.name}</strong>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{station.genre}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stadium Anthems list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>Stadium Anthems</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tracks.filter(t => t.isSportsAnthem || t.genre === 'Stadium Anthem').map((track, idx) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track, tracks)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 12, color: colors.muted, width: 20, textAlign: 'center' }}>{idx + 1}</span>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: track.cover, flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <strong style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</strong>
                <span style={{ fontSize: 11, color: colors.muted }}>{track.artist}</span>
              </div>
              <span style={{ fontSize: 10, background: 'rgba(212,175,55,0.15)', color: colors.gold, padding: '3px 8px', borderRadius: 10, fontWeight: 700 }}>STADIUM</span>
              <button style={{ fontSize: 14, color: colors.muted, border: 'none', background: 'none', cursor: 'pointer' }}>▶</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== LIBRARY TAB =====
type LibrarySegment = 'playlists' | 'artists' | 'albums' | 'songs' | 'downloaded'

const LibraryTab: React.FC<{ albums: Album[]; tracks: Track[]; onPlayAlbum: (a: Album) => void; onSelectAlbum: (a: Album) => void; onPlayTrack: (t: Track, list: Track[]) => void }> = ({ albums, tracks, onPlayAlbum, onSelectAlbum, onPlayTrack }) => {
  const [activeSegment, setActiveSegment] = useState<LibrarySegment>('playlists')

  const segments: { id: LibrarySegment; label: string; icon: string }[] = [
    { id: 'playlists', label: 'Playlists', icon: '🎵' },
    { id: 'artists', label: 'Artists', icon: '👤' },
    { id: 'albums', label: 'Albums', icon: '💿' },
    { id: 'songs', label: 'Songs', icon: '🎶' },
    { id: 'downloaded', label: 'Downloaded', icon: '⬇' },
  ]

  return (
    <div style={{ padding: '16px 16px 24px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
        <h2 style={{ fontSize: 18, letterSpacing: -0.3 }}>📚 Your Library</h2>
      </div>

      {/* Segmented control */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBountry: 16, marginBottom: 16, WebkitOverflowScrolling: 'touch' }}>
        {segments.map((seg) => (
          <button
            key={seg.id}
            onClick={() => setActiveSegment(seg.id)}
            style={{
              background: activeSegment === seg.id ? colors.accent : colors.card,
              border: `1px solid ${activeSegment === seg.id ? colors.accent : 'rgba(255,255,255,0.08)'}`,
              color: activeSegment === seg.id ? '#fff' : colors.text,
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{seg.icon}</span>
            {seg.label}
          </button>
        ))}
      </div>

      {/* Recently Added */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, letterSpacing: -0.3 }}>Recently Added</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          {albums.slice(0, 4).map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              style={{ cursor: 'pointer', transition: 'transform 0.2s', background: colors.card, padding: 10, borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = colors.cardHover }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = colors.card }}
            >
              <div style={{ aspectRatio: 1, borderRadius: 10, position: 'relative', overflow: 'hidden', marginBottom: 10, background: album.cover }}>
                {album.explicit && (
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', width: 16, height: 16, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>E</span>
                )}
              </div>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</strong>
              <span style={{ fontSize: 11, color: colors.muted }}>{album.artist}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Tracks */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, letterSpacing: -0.3 }}>Top Tracks</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...tracks].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 8).map((track) => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track, tracks)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 8, background: track.cover, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
                ▶
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <strong style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</strong>
                <span style={{ fontSize: 11, color: colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</span>
              </div>
              {track.explicit && <ExplicitBadge />}
              <span style={{ fontSize: 12, color: colors.muted, flexShrink: 0 }}>❤️ {track.likes}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ===== SEARCH TAB =====
const SearchTab: React.FC<{ search: string; onSearchChange: (s: string) => void; albums: Album[]; tracks: Track[]; onPlayAlbum: (a: Album) => void; onSelectAlbum: (a: Album) => void; onPlayTrack: (t: Track, list: Track[]) => void }> = ({ search, onSearchChange, albums, tracks, onPlayAlbum, onSelectAlbum, onPlayTrack }) => {
  const filteredAlbums = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return []
    return albums.filter(a => `${a.title} ${a.artist}`.toLowerCase().includes(q))
  }, [search, albums])

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return []
    return tracks.filter(t => `${t.title} ${t.artist}`.toLowerCase().includes(q))
  }, [search, tracks])

  return (
    <div style={{ padding: '16px 16px 24px', minHeight: '100%' }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: colors.muted, fontSize: 18 }}>⌕</span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Songs, artists, albums..."
          autoFocus
          style={{
            width: '100%',
            background: colors.card,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '12px 40px 12px 40px',
            color: colors.text,
            fontSize: 15,
            outline: 'none',
          }}
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: colors.muted, fontSize: 16, border: 'none', background: 'none', cursor: 'pointer' }}
          >✕</button>
        )}
      </div>

      {search.trim() ? (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, letterSpacing: -0.3 }}>Albums</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
              {filteredAlbums.map((a) => (
                <div key={a.id} onClick={() => onSelectAlbum(a)} style={{ cursor: 'pointer', background: colors.card, padding: 8, borderRadius: 12 }}>
                  <div style={{ aspectRatio: 1, borderRadius: 8, background: a.cover, marginBottom: 6 }} />
                  <strong style={{ display: 'block', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</strong>
                  <span style={{ fontSize: 10, color: colors.muted }}>{a.artist}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, letterSpacing: -0.3 }}>Tracks</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTracks.map((t) => (
                <div key={t.id} onClick={() => onPlayTrack(t, tracks)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', cursor: 'pointer' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: t.cover, flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <strong style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</strong>
                    <span style={{ fontSize: 11, color: colors.muted }}>{t.artist}</span>
                  </div>
                  {t.explicit && <ExplicitBadge />}
                </div>
              ))}
            </div>
            {filteredTracks.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: colors.muted, fontSize: 14 }}>No results for "{search}".</div>}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.muted, fontSize: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <span>Search for your favorite tracks, artists, or albums</span>
        </div>
      )}
    </div>
  )
}

// ===== ACCOUNT MODAL =====
interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onSignOut: () => void
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, user, onSignOut }) => {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      zIndex: 300,
      animation: 'fadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        style={{
          background: colors.bg2,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
          padding: 28,
          width: '100%',
          maxWidth: 420,
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'slideUpSheet 0.4s ease',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, colors.gold, #ff8c00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#000',
          }}>
            {(user?.fullName || 'K')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, marginBottom: 2 }}>{user?.fullName || 'Kuslord VIP'}</h3>
            <span style={{ fontSize: 12, color: colors.muted }}>{user?.email || 'member@kuslords.club'}</span>
          </div>
          <button
            onClick={onClose}
            style={{ fontSize: 18, color: colors.muted, border: 'none', background: 'none', cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Subscription tier */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(250,45,108,0.15))',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <span style={{ fontSize: 10, letterSpacing: 1, color: colors.gold, fontWeight: 700 }}>SUBSCRIPTION</span>
            <p style={{ fontSize: 14, marginTop: 2 }}>{user?.tier === 'Family' ? '👨‍👩‍👧 Family Plan' : user?.tier === 'Premium' ? '⭐ Premium' : 'Free Tier'}</p>
          </div>
          <span style={{ fontSize: 20 }}>👑</span>
        </div>

        {/* Menu items */}
        {[
          { icon: '👤', label: 'Profile & Account Settings' },
          { icon: '🎵', label: 'Music Profile & Preferences' },
          { icon: '💳', label: 'Purchase History' },
          { icon: '👨‍👩‍👧', label: 'Family Sharing' },
          { icon: '⬇', label: 'Manage Downloads' },
          { icon: '🔗', label: 'Linked Accounts' },
          { icon: '⚙', label: 'Settings' },
        ].map((item, idx) => (
          <button
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              width: '100%',
              border: 'none',
              background: 'none',
              color: colors.text,
              fontSize: 14,
              cursor: 'pointer',
              borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <span style={{ fontSize: 18, width: 24 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ color: colors.muted, fontSize: 16 }}>›</span>
          </button>
        ))}

            {/* Sign out */}
            <button
              onClick={onSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 0',
                width: '100%',
                border: 'none',
                background: 'none',
                color: colors.accent,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span style={{ fontSize: 18, width: 24 }}>↪</span>
              <span>Sign Out</span>
            </button>
      </div>
    </div>
  )
}

// ===== MAIN APP COMPONENT =====
export default function MusicStreamingApp() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [search, setSearch] = useState('')
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [user, setUser] = useState<UserProfile | null>({
    id: 'demo-1',
    email: 'royal@kuslords.club',
    fullName: 'Kuslord VIP',
    tier: 'Premium',
  })

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentTrackRef = useRef<Track | null>(null)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
    }
    const audio = audioRef.current
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [volume])

  const playTrack = useCallback((track: Track, trackList: Track[]) => {
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl
      audioRef.current.currentTime = 0
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
    setCurrentTrack(track)
    currentTrackRef.current = track
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) { audio.play(); setIsPlaying(true) }
    else { audio.pause(); setIsPlaying(false) }
  }, [])

  const nextTrack = useCallback(() => {
    const track = currentTrackRef.current
    if (!track) return
    const allTracks = sampleTracks
    const index = allTracks.findIndex(t => t.id === track.id)
    const next = allTracks[(index + 1) % allTracks.length]
    playTrack(next, allTracks)
  }, [playTrack])

  const prevTrack = useCallback(() => {
    const track = currentTrackRef.current
    if (!track) return
    const allTracks = sampleTracks
    const index = allTracks.findIndex(t => t.id === track.id)
    const prev = allTracks[(index - 1 + allTracks.length) % allTracks.length]
    playTrack(prev, allTracks)
  }, [playTrack])

  const handleSeek = (time: number) => {
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time) }
  }

  const handleVolume = (v: number) => {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const handleSignOut = () => {
    setUser(null)
    setAccountModalOpen(false)
  }

  // Scroll to top on tab change
  useEffect(() => {
    const content = document.querySelector('.mobile-content')
    if (content) content.scrollTop = 0
  }, [activeTab])

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif',
      background: colors.bg,
      color: colors.text,
      overflow: 'hidden',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${colors.accent}; cursor: pointer; }
      `}</style>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 124 }}>
        {selectedAlbum ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
            <button
              onClick={() => setSelectedAlbum(null)}
              style={{ color: colors.muted, fontSize: 14, marginBottom: 12, display: 'block', border: 'none', background: 'none', cursor: 'pointer' }}
            >← Back</button>
            {/* Album detail view would go here - simplified for MVP */}
            <div style={{ background: selectedAlbum.cover, borderRadius: 16, padding: 24, marginBottom: 20, position: 'relative', overflow: 'hidden', minHeight: 200, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: 11, letterSpacing: 1, color: 'rgba(255,255,255,0.85)' }}>{selectedAlbum.category.toUpperCase()}</span>
                <h1 style={{ fontSize: 28, margin: '6px 0', color: '#fff' }}>{selectedAlbum.title}</h1>
                <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 16, fontSize: 13 }}>{selectedAlbum.description}</p>
                <button
                  onClick={() => { if (selectedAlbum.tracks.length) playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks) }}
                  style={{ background: colors.text, color: colors.bg, padding: '8px 20px', borderRadius: 20, fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}
                >▶ Play Full Album</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedAlbum.tracks.map((track, index) => {
                const isCurrent = currentTrack?.id === track.id
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(track, selectedAlbum.tracks)}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 60px', alignItems: 'center', padding: '10px 14px', background: colors.card, borderRadius: 8, cursor: 'pointer' }}>
                    <span style={{ color: isCurrent ? colors.accent : colors.muted, fontSize: 12 }}>
                      {isCurrent ? (isPlaying ? '♪' : '❚❚') : index + 1}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, background: track.cover }} />
                      <div>
                        <strong style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</strong>
                        {track.explicit && <ExplicitBadge />}
                      </div>
                    </div>
                    <span style={{ color: colors.muted, fontSize: 12, textAlign: 'right' }}>{formatTime(track.duration)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }} className="mobile-content">
            {activeTab === 'home' && (
              <HomeTab
                albums={sampleAlbums}
                onPlayAlbum={(album) => { if (album.tracks.length) playTrack(album.tracks[0], album.tracks) }}
                onSelectAlbum={setSelectedAlbum}
                onPlayTrack={playTrack}
              />
            )}
            {activeTab === 'browse' && (
              <BrowseTab
                albums={sampleAlbums}
                onPlayAlbum={(album) => { if (album.tracks.length) playTrack(album.tracks[0], album.tracks) }}
                onSelectAlbum={setSelectedAlbum}
              />
            )}
            {activeTab === 'radio' && (
              <RadioTab tracks={sampleTracks} onPlayTrack={playTrack} />
            )}
            {activeTab === 'library' && (
              <LibraryTab
                albums={sampleAlbums}
                tracks={sampleTracks}
                onPlayAlbum={(album) => { if (album.tracks.length) playTrack(album.tracks[0], album.tracks) }}
                onSelectAlbum={setSelectedAlbum}
                onPlayTrack={playTrack}
              />
            )}
            {activeTab === 'search' && (
              <SearchTab
                search={search}
                onSearchChange={setSearch}
                albums={sampleAlbums}
                tracks={sampleTracks}
                onPlayAlbum={(album) => { if (album.tracks.length) playTrack(album.tracks[0], album.tracks) }}
                onSelectAlbum={setSelectedAlbum}
                onPlayTrack={playTrack}
              />
            )}
          </div>
        )}
      </div>

      {/* Persistent Mini-Player */}
      {currentTrack && (
        <MiniPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onExpand={() => setFullPlayerOpen(true)}
          onNext={nextTrack}
        />
      )}

      {/* Full Screen Player */}
      {fullPlayerOpen && (
        <FullPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onVolume={handleVolume}
          onCollapse={() => setFullPlayerOpen(false)}
          onNext={nextTrack}
          onPrev={prevTrack}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Account Modal */}
      <AccountModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        user={user}
        onSignOut={handleSignOut}
      />
    </div>
  )
}