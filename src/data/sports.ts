export interface SportsMatch {
  id: string
  league: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: 'LIVE' | 'UPCOMING' | 'FT'
  minute?: string
  anthemTrackId: string
  stadium: string
}

export const sportsMatches: SportsMatch[] = [
  {
    id: 'sm-1',
    league: 'Premier League',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeScore: 2,
    awayScore: 1,
    status: 'LIVE',
    minute: "74'",
    anthemTrackId: 't-sports-1',
    stadium: 'Emirates Stadium',
  },
  {
    id: 'sm-2',
    league: 'UEFA Champions League',
    homeTeam: 'Real Madrid',
    awayTeam: 'Bayern Munich',
    homeScore: 3,
    awayScore: 2,
    status: 'LIVE',
    minute: "88'",
    anthemTrackId: 't-sports-4',
    stadium: 'Santiago Bernabéu',
  },
  {
    id: 'sm-3',
    league: 'La Liga',
    homeTeam: 'Barcelona',
    awayTeam: 'Atlético Madrid',
    homeScore: 1,
    awayScore: 0,
    status: 'FT',
    anthemTrackId: 't-sports-2',
    stadium: 'Camp Nou',
  },
  {
    id: 'sm-4',
    league: 'Royal Kus-Lords Cup',
    homeTeam: 'Lords Kings FC',
    awayTeam: 'Golden Hawks',
    homeScore: 4,
    awayScore: 3,
    status: 'LIVE',
    minute: "90+2'",
    anthemTrackId: 't7',
    stadium: 'Nexus Royal Arena',
  },
]