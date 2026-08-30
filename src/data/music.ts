export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  audioUrl: string
  cover: string
}

export interface Album {
  id: string
  title: string
  artist: string
  description: string
  cover: string
  tracks: Track[]
}

const gradient = (colors: string) => `linear-gradient(135deg, ${colors})`

const tracks = [
  {
    id: 't1',
    title: 'Midnight Drive',
    artist: 'Neon Coast',
    album: 'Midnight Highway',
    duration: 368,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover: gradient('#f857a6, #614ad2'),
  },
  {
    id: 't2',
    title: 'Golden Hour',
    artist: 'The Velvet Shores',
    album: 'Coastal Lights',
    duration: 412,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover: gradient('#f5afd, #ff6b6b'),
  },
  {
    id: 't3',
    title: 'Glass Waves',
    artist: 'Polar Nights',
    album: 'Aurora',
    duration: 291,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover: gradient('#00c9ff, #7b2fff'),
  },
  {
    id: 't4',
    title: 'Silk City',
    artist: 'Marble Sky',
    album: 'Neo Tokyo',
    duration: 335,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    cover: gradient('#f6d365, #f97794'),
  },
  {
    id: 't5',
    title: 'Inner Light',
    artist: 'Monk & Visitor',
    album: 'Meditation',
    duration: 254,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    cover: gradient('#11998e, #38ef7d'),
  },
  {
    id: 't6',
    title: 'Pacific St.',
    artist: 'Lush',
    album: 'Drift',
    duration: 402,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    cover: gradient('#13547a, #73c8d5'),
  },
  {
    id: 't7',
    title: 'Night Skyline',
    artist: 'Analog Youth',
    album: 'Tomorrowland',
    duration: 298,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
    cover: gradient('#2b32b2, #e53170'),
  },
  {
    id: 't8',
    title: 'Vapor Run',
    artist: 'Chrome',
    album: 'Night Drive',
    duration: 356,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    cover: gradient('#7f5fff, #ff7fff'),
  },
  {
    id: 't9',
    title: 'Heartbeat FM',
    artist: 'Silk Coda',
    album: 'Radio Waves',
    duration: 344,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    cover: gradient('#fc466b, #ffd200'),
  },
  {
    id: 't10',
    title: 'Lunar Tides',
    artist: 'Deep Current',
    album: 'Oceanic',
    duration: 382,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    cover: gradient('#00f89b, #6a8bff'),
  },
  {
    id: 't11',
    title: 'Echo Park',
    artist: 'Moss',
    album: 'Botanica',
    duration: 273,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
    cover: gradient('#4b6cb7, #814d92'),
  },
  {
    id: 't12',
    title: 'Arcade Hearts',
    artist: 'Code Parallax',
    album: 'Pixels',
    duration: 364,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
    cover: gradient('#fa709a, #b721ff'),
  },
  {
    id: 't13',
    title: 'Open Sea',
    artist: 'Harbor Lights',
    album: 'Wavelengths',
    duration: 388,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
    cover: gradient('#136a8e, #f43b9b'),
  },
  {
    id: 't14',
    title: 'Soft Focus',
    artist: 'Cove',
    album: 'Focused Mind',
    duration: 316,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
    cover: gradient('#60c3fa, #7e54ff'),
  },
  {
    id: 't15',
    title: 'Electric Bloom',
    artist: 'Petal Maze',
    album: 'Garden City',
    duration: 301,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    cover: gradient('#f953c6, #3b8dff'),
  },
  {
    id: 't16',
    title: 'Afterglow',
    artist: 'Sunset Arcade',
    album: 'Golden Hour',
    duration: 347,
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
    cover: gradient('#f5afd, #ff5f6d'),
  },
]

export const albums: Album[] = [
  {
    id: 'a1',
    title: 'Midnight Highway',
    artist: 'Neon Coast',
    description: 'Late night synthwave for city drives.',
    cover: gradient('#f857a6, #614ad2'),
    tracks: tracks.slice(0, 4),
  },
  {
    id: 'a2',
    title: 'Aurora',
    artist: 'Polar Nights',
    description: 'Ambient electronic chill.',
    cover: gradient('#00c9ff, #7b2fff'),
    tracks: [tracks[2], tracks[4], tracks[5], tracks[9]],
  },
  {
    id: 'a3',
    title: 'Drift',
    artist: 'Lush',
    description: 'Smooth waves for focus and reading.',
    cover: gradient('#11998e, #38ef7d'),
    tracks: [tracks[4], tracks[5], tracks[9], tracks[12]],
  },
  {
    id: 'a4',
    title: 'Neo Tokyo',
    artist: 'Marble Sky',
    description: 'Future bass and chrome dreams.',
    cover: gradient('#f6d365, #f97794'),
    tracks: [tracks[3], tracks[6], tracks[7], tracks[11]],
  },
  {
    id: 'a5',
    title: 'Oceanic',
    artist: 'Deep Current',
    description: 'A deep sea ambient journey.',
    cover: gradient('#13547a, #73c8d5'),
    tracks: [tracks[5], tracks[9], tracks[12], tracks[13]],
  },
  {
    id: 'a6',
    title: 'Botanica',
    artist: 'Moss',
    description: 'Organic electronic gardens.',
    cover: gradient('#4b6cb7, #814d92'),
    tracks: [tracks[10], tracks[7], tracks[14], tracks[15]],
  },
  {
    id: 'a7',
    title: 'Wavelengths',
    artist: 'Harbor Lights',
    description: 'Coastal synth sessions.',
    cover: gradient('#136a8e, #f43b9b'),
    tracks: [tracks[12], tracks[13], tracks[5], tracks[8]],
  },
  {
    id: 'a8',
    title: 'Golden Hour',
    artist: 'Sunset Arcade',
    description: 'Warm tracks for late-day listening.',
    cover: gradient('#f5afd, #ff5f6d'),
    tracks: [tracks[15], tracks[1], tracks[8], tracks[7]],
  },
]

export const allTracks: Track[] = tracks