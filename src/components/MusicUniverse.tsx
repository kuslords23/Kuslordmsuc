import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Track } from '../data/music'
import type { PublicMusicArtistProfile } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import './MusicUniverse.css'

type Section = 'discover' | 'charts' | 'radio' | 'podcasts' | 'community'
type Podcast = { id: string; title: string; description: string; cover_url: string | null; publisher: string; category: string }
type Episode = { id: string; show_id: string; title: string; description: string; audio_url: string; cover_url: string | null; duration_seconds: number; published_at: string | null }
type Station = { id: string; name: string; description: string; genre: string; cover_url: string | null }
type Props = { tracks: Track[]; artists: PublicMusicArtistProfile[]; userId?: string; onPlay: (track: Track, queue: Track[]) => void }

const sections: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'discover', label: 'Discover', icon: '✦' },
  { id: 'charts', label: 'Charts', icon: '↗' },
  { id: 'radio', label: 'Radio', icon: '◉' },
  { id: 'podcasts', label: 'Podcasts', icon: '◖' },
  { id: 'community', label: 'Community', icon: '♧' },
]

const coverStyle = (cover?: string | null) => cover?.startsWith('http') ? { backgroundImage: `url("${cover}")` } : cover ? { background: cover } : {}

export default function MusicUniverse({ tracks, artists, userId, onPlay }: Props) {
  const [section, setSection] = useState<Section>('discover')
  const [stations, setStations] = useState<Station[]>([])
  const [shows, setShows] = useState<Podcast[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedShow, setSelectedShow] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [followed, setFollowed] = useState<string[]>([])
  const [subscribed, setSubscribed] = useState<string[]>([])
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!supabase) return
    let active = true
    setLoading(true)
    Promise.all([
      supabase.from('music_radio_stations').select('id,name,description,genre,cover_url').eq('is_active', true).order('name'),
      supabase.from('music_podcast_shows').select('id,title,description,cover_url,publisher,category').eq('is_published', true).order('created_at', { ascending: false }),
      userId ? supabase.from('music_artist_follows').select('artist_profile_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
      userId ? supabase.from('music_podcast_subscriptions').select('show_id').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
    ]).then(([stationResult, showResult, followResult, subscriptionResult]) => {
      if (!active) return
      setStations(stationResult.data || [])
      setShows(showResult.data || [])
      setFollowed((followResult.data || []).map((row: any) => String(row.artist_profile_id)))
      setSubscribed((subscriptionResult.data || []).map((row: any) => String(row.show_id)))
    }).catch(() => { if (active) setMessage('Some cloud discovery services are unavailable. The published music catalogue remains available.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId])

  const filteredTracks = useMemo(() => {
    const term = query.trim().toLowerCase()
    return tracks.filter(track => !term || `${track.title} ${track.artist} ${track.album} ${track.genre || ''}`.toLowerCase().includes(term))
  }, [tracks, query])

  const charts = useMemo(() => [...tracks].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0)), [tracks])
  const genres = useMemo(() => Array.from(new Set(tracks.map(track => track.genre?.trim()).filter((value): value is string => Boolean(value)))), [tracks])
  const activeEpisodes = episodes.filter(episode => !selectedShow || episode.show_id === selectedShow)

  const loadEpisodes = async (showId: string) => {
    setSelectedShow(showId)
    if (!supabase) return
    const { data, error } = await supabase.from('music_podcast_episodes').select('id,show_id,title,description,audio_url,cover_url,duration_seconds,published_at').eq('show_id', showId).eq('is_published', true).order('published_at', { ascending: false })
    if (error) setMessage('Episodes could not be loaded: ' + error.message)
    else setEpisodes(data || [])
  }

  const toggleFollow = async (artistId: string) => {
    if (!userId || !supabase) { setMessage('Sign in to follow artists and sync your community.'); return }
    const exists = followed.includes(artistId)
    const result = exists
      ? await supabase.from('music_artist_follows').delete().eq('user_id', userId).eq('artist_profile_id', artistId)
      : await supabase.from('music_artist_follows').insert({ user_id: userId, artist_profile_id: artistId })
    if (result.error) setMessage(result.error.message)
    else setFollowed(current => exists ? current.filter(id => id !== artistId) : [...current, artistId])
  }

  const toggleSubscription = async (showId: string) => {
    if (!userId || !supabase) { setMessage('Sign in to subscribe to podcasts.'); return }
    const exists = subscribed.includes(showId)
    const result = exists
      ? await supabase.from('music_podcast_subscriptions').delete().eq('user_id', userId).eq('show_id', showId)
      : await supabase.from('music_podcast_subscriptions').insert({ user_id: userId, show_id: showId })
    if (result.error) setMessage(result.error.message)
    else setSubscribed(current => exists ? current.filter(id => id !== showId) : [...current, showId])
  }

  const saveProgress = async (episode: Episode, seconds: number) => {
    setEpisodeProgress(current => ({ ...current, [episode.id]: seconds }))
    if (userId && supabase) {
      const { error } = await supabase.from('music_podcast_progress').upsert({ user_id: userId, episode_id: episode.id, position_seconds: seconds, completed: seconds >= episode.duration_seconds * 0.95 }, { onConflict: 'user_id,episode_id' })
      if (error) setMessage('Progress is stored on this screen but could not sync: ' + error.message)
    }
  }

  return <div className="music-universe">
    <header className="mu-hero">
      <div><span className="mu-eyebrow">KUS-LORDS MUSIC · YOUR SOUND UNIVERSE</span><h1>Find your next favourite.</h1><p>Discover releases, follow artists, explore charts and tune into stories worth hearing.</p></div>
      <div className="mu-hero-note"><span>♫</span><strong>{tracks.length.toLocaleString()}</strong><small>published tracks in your connected catalogue</small></div>
    </header>
    <nav className="mu-tabs" aria-label="Music destinations">{sections.map(item => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
    {message && <div className="mu-message" role="status">{message}<button onClick={() => setMessage('')} aria-label="Dismiss">×</button></div>}
    {section === 'discover' && <div className="mu-content">
      <div className="mu-search"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search your connected music catalogue" /></div>
      <section><div className="mu-section-heading"><div><span className="mu-eyebrow">MADE FOR THE MOMENT</span><h2>Explore by sound</h2></div></div><div className="mu-genre-grid">{genres.length ? genres.map((genre, index) => <button key={genre} style={{ '--mu-hue': (index * 47 + 22) % 360 } as CSSProperties} onClick={() => setQuery(genre)}>{genre}<span>Explore tracks ↗</span></button>) : <p className="mu-empty">Genres will appear as artists publish richer track metadata.</p>}</div></section>
      <section><div className="mu-section-heading"><div><span className="mu-eyebrow">THE CATALOGUE</span><h2>{query ? 'Search results' : 'Recently released'}</h2></div><span>{filteredTracks.length} tracks</span></div><div className="mu-track-grid">{filteredTracks.slice(0, 24).map((track, index) => <button className="mu-track-card" key={track.id} onClick={() => onPlay(track, filteredTracks)}><span className="mu-track-art" style={coverStyle(track.cover)}><i>{index + 1}</i><b>▶</b></span><strong>{track.title}</strong><small>{track.artist} · {track.album || 'Single'}</small></button>)}</div>{!filteredTracks.length && <p className="mu-empty">No matching tracks in the connected catalogue.</p>}</section>
    </div>}
    {section === 'charts' && <div className="mu-content"><div className="mu-section-heading"><div><span className="mu-eyebrow">COMMUNITY SIGNAL</span><h2>Popular in Kus-Lords</h2><p>Ranked by likes recorded in the connected catalogue. This is not a global industry chart.</p></div></div><div className="mu-chart-list">{charts.slice(0, 30).map((track, index) => <button key={track.id} onClick={() => onPlay(track, charts)}><span className="mu-rank">{String(index + 1).padStart(2, '0')}</span><span className="mu-chart-art" style={coverStyle(track.cover)} /><span className="mu-chart-meta"><strong>{track.title}</strong><small>{track.artist} · {track.album}</small></span><span className="mu-chart-likes">♥ {track.likes || 0}</span><span>▶</span></button>)}</div>{!charts.length && <p className="mu-empty">Charts will populate as the community listens and likes music.</p>}</div>}
    {section === 'radio' && <div className="mu-content"><div className="mu-section-heading"><div><span className="mu-eyebrow">ALWAYS IN TUNE</span><h2>Radio stations</h2><p>Curated stations are managed from the music catalogue. Genre mixes are generated from available tracks.</p></div></div><div className="mu-station-grid">{stations.map(station => <button key={station.id} onClick={() => { const list = tracks.filter(track => track.genre?.toLowerCase() === station.genre.toLowerCase()); if (list.length) onPlay(list[0], list); else setMessage('This station has no playable catalogue tracks yet.') }}><span className="mu-station-art" style={coverStyle(station.cover_url)}>◉</span><strong>{station.name}</strong><small>{station.description}</small><em>{station.genre}</em></button>)}{genres.map(genre => <button key={'genre-' + genre} onClick={() => { const list = tracks.filter(track => track.genre === genre); if (list.length) onPlay(list[0], list) }}><span className="mu-station-art">♫</span><strong>{genre} Mix</strong><small>A continuous mix from tracks tagged {genre}.</small><em>{tracks.filter(track => track.genre === genre).length} tracks</em></button>)}</div>{!stations.length && !genres.length && <p className="mu-empty">Radio stations will appear when stations are published or tracks include genre metadata.</p>}</div>}
    {section === 'podcasts' && <div className="mu-content"><div className="mu-section-heading"><div><span className="mu-eyebrow">LISTEN BEYOND MUSIC</span><h2>Podcasts</h2><p>Subscribe to shows and resume episodes across sessions. Podcast audio must be owned or properly licensed by its publisher.</p></div></div>{loading && <p className="mu-empty">Loading podcast catalogue…</p>}<div className="mu-podcast-grid">{shows.map(show => <article key={show.id} className="mu-podcast-card"><span className="mu-podcast-art" style={coverStyle(show.cover_url)}>◖</span><div><small>{show.category} · {show.publisher}</small><h3>{show.title}</h3><p>{show.description}</p><div className="mu-card-actions"><button onClick={() => void loadEpisodes(show.id)}>Episodes</button><button onClick={() => void toggleSubscription(show.id)}>{subscribed.includes(show.id) ? 'Subscribed ✓' : 'Subscribe +'}</button></div></div></article>)}</div>{!shows.length && !loading && <p className="mu-empty">No podcast shows have been published yet. Add shows and episodes through the catalogue management backend.</p>}{selectedShow && <section className="mu-episodes"><div className="mu-section-heading"><h2>Episodes</h2><button onClick={() => setSelectedShow(null)}>Close</button></div>{activeEpisodes.map(episode => <article key={episode.id}><div><strong>{episode.title}</strong><small>{episode.description}</small></div><audio controls preload="none" src={episode.audio_url} onTimeUpdate={event => { const audio = event.currentTarget; const seconds = audio.currentTime; const lastSaved = Number(audio.dataset.lastSaved || 0); if (seconds - lastSaved >= 15) { audio.dataset.lastSaved = String(seconds); void saveProgress(episode, seconds) } }} onEnded={() => void saveProgress(episode, episode.duration_seconds)} /><small>{Math.round((episodeProgress[episode.id] || 0) / 60)} min saved</small></article>)}</section>}</div>}
    {section === 'community' && <div className="mu-content"><div className="mu-section-heading"><div><span className="mu-eyebrow">PEOPLE BEHIND THE SOUND</span><h2>Artist community</h2><p>Follow creators and keep their releases close. Listening activity stays private unless you choose to share it.</p></div></div><div className="mu-artist-grid">{artists.map(artist => <article key={artist.id}><span className="mu-artist-avatar" style={coverStyle(artist.avatar)}>{artist.avatar.startsWith('http') ? '' : artist.avatar}</span><div><strong>{artist.name} {artist.verified ? '✓' : ''}</strong><small>{artist.tagline || artist.genreFocus || 'Independent artist'}</small><small>{artist.followerCount.toLocaleString()} followers</small></div><button onClick={() => void toggleFollow(artist.id)}>{followed.includes(artist.id) ? 'Following' : 'Follow'}</button></article>)}</div>{!artists.length && <p className="mu-empty">Artist profiles will appear as creators publish their profiles.</p>}</div>}
    {!supabase && <p className="mu-footnote">Cloud features require the connected Supabase service.</p>}
  </div>
}
