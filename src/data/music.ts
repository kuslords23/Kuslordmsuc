export interface Track {
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
}

export interface Album {
  id: string
  title: string
  artist: string
  description: string
  cover: string
  category: 'royals' | 'sports' | 'vibes' | 'chill' | 'afro'
  tracks: Track[]
}

const gradient = (colors: string) => `linear-gradient(135deg, ${colors})`

export const initialTracks: Track[] = [
  {
    id: 't-sports-1',
    title: 'Champions Arena Anthem',
    artist: 'Royal Kus-Lords Brass',
    album: 'Matchday Stadium Hype',
    duration: 310,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover: gradient('#d4af37, #855800'),
    genre: 'Stadium Anthem',
    isSportsAnthem: true,
    matchVibe: 'Pre-Match Tunnel Walkout',
    likes: 1420,
  },
  {
    id: 't-sports-2',
    title: 'Final Whistle Victory',
    artist: 'Dynasty Sound Squad',
    album: 'Matchday Stadium Hype',
    duration: 278,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover: gradient('#e6c656, #2d1800'),
    genre: 'High Energy',
    isSportsAnthem: true,
    matchVibe: 'Trophy Celebration',
    likes: 980,
  },
  {
    id: 't-sports-3',
    title: 'Dream League Goal Frenzy',
    artist: 'Pulse Arena',
    album: 'Fantasy League Beats',
    duration: 295,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover: gradient('#ff6b6b, #c5a059'),
    genre: 'Electronic / Bass',
    isSportsAnthem: true,
    matchVibe: 'Halftime Energy',
    likes: 854,
  },
  {
    id: 't-sports-4',
    title: '90th Minute Stoppage Time',
    artist: 'Apex Strikers',
    album: 'Fantasy League Beats',
    duration: 330,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    cover: gradient('#1e3c72, #2a5298'),
    genre: 'Epic Orchestral',
    isSportsAnthem: true,
    matchVibe: 'Clutch Comeback',
    likes: 1120,
  },
  {
    id: 't1',
    title: 'Midnight Highway Drive',
    artist: 'Neon Coast',
    album: 'Midnight Highway',
    duration: 368,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    cover: gradient('#f857a6, #614ad2'),
    genre: 'Synthwave',
    likes: 640,
  },
  {
    id: 't2',
    title: 'Royal Crown Serenade',
    artist: 'The Velvet Shores',
    album: 'Coastal Lights & Gold',
    duration: 412,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    cover: gradient('#f5af19, #e65c00'),
    genre: 'Afro Chill',
    likes: 830,
  },
  {
    id: 't3',
    title: 'Glass Waves & Aurora',
    artist: 'Polar Nights',
    album: 'Aurora Borealis',
    duration: 291,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    cover: gradient('#00c9ff, #7b2fff'),
    genre: 'Ambient Chill',
    likes: 540,
  },
  {
    id: 't4',
    title: 'Silk City Skyline',
    artist: 'Marble Sky',
    album: 'Neo Tokyo',
    duration: 335,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    cover: gradient('#f6d365, #fda085'),
    genre: 'Lo-Fi Chill',
    likes: 420,
  },
  {
    id: 't5',
    title: 'Lagos to Accra Grooves',
    artist: 'Kus-Lords Allstars',
    album: 'Royal Afro Beats',
    duration: 254,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    cover: gradient('#11998e, #38ef7d'),
    genre: 'Afrobeats',
    likes: 1530,
  },
  {
    id: 't6',
    title: 'Pacific St. Drift',
    artist: 'Lush Coast',
    album: 'Pacific Waves',
    duration: 402,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    cover: gradient('#13547a, #80d0c7'),
    genre: 'Deep House',
    likes: 710,
  },
  {
    id: 't7',
    title: 'Kuslords Golden Anthem',
    artist: 'Clan Nexus Symphony',
    album: 'Nexus Sovereign',
    duration: 315,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    cover: gradient('#e6c656, #f37335'),
    genre: 'Royal Anthem',
    isSportsAnthem: true,
    matchVibe: 'Sovereign Match Intro',
    likes: 2100,
  },
  {
    id: 't8',
    title: 'Vapor Run Horizon',
    artist: 'Chrome Pulse',
    album: 'Midnight Highway',
    duration: 356,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    cover: gradient('#7f5fff, #ff7fff'),
    genre: 'Synthwave',
    likes: 670,
  },
]

export const albums: Album[] = [
  {
    id: 'a-sports-1',
    title: 'Matchday Stadium Hype',
    artist: 'Royal Kus-Lords Sports Clan',
    description: 'Official stadium walkout tracks and arena celebration anthems.',
    cover: gradient('#d4af37, #3b2800'),
    category: 'sports',
    tracks: initialTracks.filter((t) => t.isSportsAnthem),
  },
  {
    id: 'a-sports-2',
    title: 'Fantasy League Beats',
    artist: 'Nexus Soundlab',
    description: 'Electric hype music for live scores, bets, and matchday streaming.',
    cover: gradient('#ff6b6b, #c5a059'),
    category: 'sports',
    tracks: [initialTracks[2], initialTracks[3], initialTracks[0], initialTracks[10]],
  },
  {
    id: 'a1',
    title: 'Midnight Highway',
    artist: 'Neon Coast',
    description: 'Late night synthwave for city drives and deep concentration.',
    cover: gradient('#f857a6, #614ad2'),
    category: 'vibes',
    tracks: [initialTracks[4], initialTracks[11], initialTracks[6]],
  },
  {
    id: 'a2',
    title: 'Royal Afro Beats',
    artist: 'Kus-Lords Allstars',
    description: 'High energy African rhythms and dancefloor bangers.',
    cover: gradient('#11998e, #38ef7d'),
    category: 'afro',
    tracks: [initialTracks[8], initialTracks[5], initialTracks[1]],
  },
  {
    id: 'a3',
    title: 'Nexus Sovereign & Anthems',
    artist: 'Clan Nexus Symphony',
    description: 'The definitive royal lifestyle and champions collection.',
    cover: gradient('#e6c656, #f37335'),
    category: 'royals',
    tracks: [initialTracks[10], initialTracks[0], initialTracks[1], initialTracks[8]],
  },
  {
    id: 'a4',
    title: 'Aurora Borealis Chill',
    artist: 'Polar Nights',
    description: 'Ambient chill and meditative soundscapes.',
    cover: gradient('#00c9ff, #7b2fff'),
    category: 'chill',
    tracks: [initialTracks[6], initialTracks[7], initialTracks[9]],
  },
]

export const allTracks: Track[] = initialTracks