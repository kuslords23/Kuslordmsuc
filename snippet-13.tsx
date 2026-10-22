import { sportsMatches } from '../data/sports'
import { Track } from '../data/music'

interface SportsSectionProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
  currentTrackId?: string | null
  isPlaying: boolean
}

export default function SportsSection({ tracks, onPlayTrack, currentTrackId, isPlaying }: SportsSectionProps) {
  const sportsCompanionUrl = import.meta.env.VITE_SPORTS_COMPANION_URL || 'https://sport-clan-nexus.vercel.app'

  const handlePlayMatchAnthem = (match: { id: string; anthemTrackId: string }) => {
    const track = tracks.find((t) => t.id === match.anthemTrackId) || tracks[0]
    onPlayTrack(track)
  }

  return (
    // ... (rest of component unchanged)