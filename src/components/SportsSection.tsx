import { sportsMatches, SportsMatch } from '../data/sports'
import { Track } from '../data/music'

interface SportsSectionProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
  currentTrackId?: string | null
  isPlaying: boolean
}

export default function SportsSection({ tracks, onPlayTrack, currentTrackId, isPlaying }: SportsSectionProps) {
  const sportsCompanionUrl = import.meta.env.VITE_SPORTS_COMPANION_URL || 'https://sport-clan-nexus.vercel.app'

  const handlePlayMatchAnthem = (match: SportsMatch) => {
    const track = tracks.find((t) => t.id === match.anthemTrackId) || tracks[0]
    onPlayTrack(track)
  }

  return (
    <div className="sports-section">
      <div className="sports-hero-banner">
        <div className="sports-hero-content">
          <span className="sports-tag">⚡ ROYAL SPORTS & MUSIC COMPANION</span>
          <h2>Live Matchday Soundtracks & Sports Central</h2>
          <p>
            Experience the roar of the stadium synced with official match anthems, live scores, and crowd beats.
          </p>
          <div className="sports-actions">
            <a
              href={sportsCompanionUrl}
              target="_blank"
              rel="noreferrer"
              className="companion-portal-btn"
            >
              Open Sports Companion Portal ↗
            </a>
            <span className="live-pill">● 4 MATCHES IN PLAY</span>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h2>Live Match Soundtracks</h2>
        <span className="caption">Tap any match to trigger the stadium arena soundtrack</span>
      </div>

      <div className="sports-matches-grid">
        {sportsMatches.map((m) => {
          const isCurrentMatchSong = tracks.some((t) => t.id === m.anthemTrackId && t.id === currentTrackId)
          return (
            <div key={m.id} className={`match-card ${m.status === 'LIVE' ? 'live' : ''}`}>
              <div className="match-header">
                <span className="league-badge">{m.league}</span>
                <span className={`status-badge ${m.status.toLowerCase()}`}>
                  {m.status === 'LIVE' ? `LIVE ${m.minute}` : m.status}
                </span>
              </div>
              <div className="match-scoreboard">
                <div className="team">
                  <strong>{m.homeTeam}</strong>
                  <span className="score">{m.homeScore}</span>
                </div>
                <div className="score-divider">VS</div>
                <div className="team">
                  <span className="score">{m.awayScore}</span>
                  <strong>{m.awayTeam}</strong>
                </div>
              </div>
              <div className="match-footer">
                <span className="stadium">📍 {m.stadium}</span>
                <button
                  className={`match-anthem-btn ${isCurrentMatchSong && isPlaying ? 'playing' : ''}`}
                  onClick={() => handlePlayMatchAnthem(m)}
                >
                  {isCurrentMatchSong && isPlaying ? '❚❚ Playing Stadium Vibe' : '▶ Play Match Anthem'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="section-title" style={{ marginTop: 32 }}>
        <h2>Official Stadium & Walkout Anthems</h2>
      </div>

      <div className="anthem-list">
        {tracks
          .filter((t) => t.isSportsAnthem)
          .map((track, idx) => {
            const isPlayingThis = track.id === currentTrackId && isPlaying
            return (
              <div
                key={track.id}
                className={`anthem-row ${isPlayingThis ? 'active' : ''}`}
                onClick={() => onPlayTrack(track)}
              >
                <span className="anthem-num">{isPlayingThis ? '🔊' : `0${idx + 1}`}</span>
                <div className="anthem-info">
                  <strong>{track.title}</strong>
                  <span>{track.artist} • <em className="vibe-tag">{track.matchVibe}</em></span>
                </div>
                <span className="anthem-genre">{track.genre}</span>
                <span className="anthem-likes">❤️ {track.likes}</span>
                <button className="anthem-play-btn">{isPlayingThis ? '⏸' : '▶'}</button>
              </div>
            )
          })}
      </div>
    </div>
  )
}