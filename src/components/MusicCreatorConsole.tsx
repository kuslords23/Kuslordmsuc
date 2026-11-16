import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './MusicCreatorConsole.css'

type Show = { id: string; title: string; description: string; publisher: string; category: string; is_published: boolean }
type Station = { id: string; name: string; description: string; genre: string; is_active: boolean }
type Episode = { id: string; show_id: string; title: string; duration_seconds: number; is_published: boolean }

export default function MusicCreatorConsole({ userId }: { userId?: string }) {
  const [shows, setShows] = useState<Show[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [selectedShow, setSelectedShow] = useState('')
  const [showTitle, setShowTitle] = useState('')
  const [showDescription, setShowDescription] = useState('')
  const [publisher, setPublisher] = useState('')
  const [category, setCategory] = useState('Music')
  const [episodeTitle, setEpisodeTitle] = useState('')
  const [episodeDescription, setEpisodeDescription] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [duration, setDuration] = useState('0')
  const [stationName, setStationName] = useState('')
  const [stationGenre, setStationGenre] = useState('')
  const [stationDescription, setStationDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = async () => {
    if (!supabase || !userId) return
    const [showResult, stationResult] = await Promise.all([
      supabase.from('music_podcast_shows').select('id,title,description,publisher,category,is_published').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('music_radio_stations').select('id,name,description,genre,is_active').eq('owner_id', userId).order('created_at', { ascending: false }),
    ])
    if (showResult.error || stationResult.error) setMessage(showResult.error?.message || stationResult.error?.message || 'Could not load creator catalogue.')
    const ownShows = showResult.data || []
    setShows(ownShows)
    setStations(stationResult.data || [])
    if (ownShows.length) {
      const episodeResult = await supabase.from('music_podcast_episodes').select('id,show_id,title,duration_seconds,is_published').in('show_id', ownShows.map(show => show.id)).order('created_at', { ascending: false })
      if (episodeResult.error) setMessage(episodeResult.error.message)
      setEpisodes(episodeResult.data || [])
    } else setEpisodes([])
  }

  useEffect(() => { void refresh() }, [userId])

  const createShow = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !userId || !showTitle.trim()) return
    setBusy(true); setMessage('')
    const { data, error } = await supabase.from('music_podcast_shows').insert({
      owner_id: userId, title: showTitle.trim(), description: showDescription.trim(),
      publisher: publisher.trim() || 'Independent creator', category, is_published: false,
    }).select('id').single()
    if (error) setMessage(error.message)
    else {
      setShowTitle(''); setShowDescription(''); setSelectedShow(data.id)
      setMessage('Podcast show created. Add its first episode below.')
      await refresh()
    }
    setBusy(false)
  }

  const addEpisode = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !selectedShow || !episodeTitle.trim() || !/^https:\/\//i.test(audioUrl.trim())) {
      setMessage('Choose a show, enter an episode title and provide a secure HTTPS audio URL.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('music_podcast_episodes').insert({
      show_id: selectedShow, title: episodeTitle.trim(), description: episodeDescription.trim(),
      audio_url: audioUrl.trim(), duration_seconds: Math.max(0, Math.floor(Number(duration) || 0)),
      is_published: true, published_at: new Date().toISOString(),
    })
    if (error) setMessage(error.message)
    else {
      setEpisodeTitle(''); setEpisodeDescription(''); setAudioUrl(''); setDuration('0')
      setMessage('Episode published.'); await refresh()
    }
    setBusy(false)
  }

  const toggleShow = async (show: Show) => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('music_podcast_shows').update({ is_published: !show.is_published, updated_at: new Date().toISOString() }).eq('id', show.id)
    if (error) setMessage(error.message); else await refresh()
    setBusy(false)
  }

  const toggleEpisode = async (episode: Episode) => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('music_podcast_episodes').update({ is_published: !episode.is_published, published_at: !episode.is_published ? new Date().toISOString() : null }).eq('id', episode.id)
    if (error) setMessage(error.message); else await refresh()
    setBusy(false)
  }

  const deleteEpisode = async (episode: Episode) => {
    if (!supabase || !window.confirm('Delete this episode permanently?')) return
    setBusy(true)
    const { error } = await supabase.from('music_podcast_episodes').delete().eq('id', episode.id)
    if (error) setMessage(error.message); else await refresh()
    setBusy(false)
  }

  const createStation = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !userId || !stationName.trim() || !stationGenre.trim()) return
    setBusy(true)
    const { error } = await supabase.from('music_radio_stations').insert({
      owner_id: userId, name: stationName.trim(), genre: stationGenre.trim(),
      description: stationDescription.trim(), is_active: true,
    })
    if (error) setMessage(error.message)
    else {
      setStationName(''); setStationGenre(''); setStationDescription('')
      setMessage('Radio station created and published.'); await refresh()
    }
    setBusy(false)
  }

  const toggleStation = async (station: Station) => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('music_radio_stations').update({ is_active: !station.is_active, updated_at: new Date().toISOString() }).eq('id', station.id)
    if (error) setMessage(error.message); else await refresh()
    setBusy(false)
  }

  const deleteStation = async (station: Station) => {
    if (!supabase || !window.confirm('Delete this radio station?')) return
    setBusy(true)
    const { error } = await supabase.from('music_radio_stations').delete().eq('id', station.id)
    if (error) setMessage(error.message); else await refresh()
    setBusy(false)
  }

  if (!userId) return <div className="mcc"><h2>Creator Studio</h2><p>Sign in to publish podcasts and manage your own radio stations.</p></div>

  return <div className="mcc">
    <header><span>CREATOR TOOLS</span><h2>Publish your sound</h2><p>Manage podcast shows, episodes and radio stations. Only content you own is editable here.</p></header>
    {message && <p className="mcc-message" role="status">{message}</p>}
    <div className="mcc-grid">
      <section><h3>Start a podcast</h3><form onSubmit={createShow}>
        <label>Show title<input value={showTitle} onChange={event => setShowTitle(event.target.value)} maxLength={100} required /></label>
        <label>Description<textarea value={showDescription} onChange={event => setShowDescription(event.target.value)} rows={3} /></label>
        <label>Publisher<input value={publisher} onChange={event => setPublisher(event.target.value)} maxLength={100} /></label>
        <label>Category<select value={category} onChange={event => setCategory(event.target.value)}>{['Music','Culture','News','Education','Comedy','Technology','Business','Lifestyle','Other'].map(value => <option key={value}>{value}</option>)}</select></label>
        <button disabled={busy}>Create show</button>
      </form></section>
      <section><h3>Add an episode</h3><form onSubmit={addEpisode}>
        <label>Podcast show<select value={selectedShow} onChange={event => setSelectedShow(event.target.value)} required><option value="">Choose your show</option>{shows.map(show => <option value={show.id} key={show.id}>{show.title}</option>)}</select></label>
        <label>Episode title<input value={episodeTitle} onChange={event => setEpisodeTitle(event.target.value)} maxLength={140} required /></label>
        <label>Description<textarea value={episodeDescription} onChange={event => setEpisodeDescription(event.target.value)} rows={3} /></label>
        <label>HTTPS audio URL<input type="url" value={audioUrl} onChange={event => setAudioUrl(event.target.value)} placeholder="https://…" required /></label>
        <label>Duration (seconds)<input type="number" min="0" value={duration} onChange={event => setDuration(event.target.value)} /></label>
        <button disabled={busy || !shows.length}>Publish episode</button>
      </form></section>
      <section><h3>Your shows</h3>{shows.length ? shows.map(show => <article key={show.id}><div><strong>{show.title}</strong><small>{show.category} · {show.is_published ? 'Published' : 'Draft'}</small></div><button disabled={busy} onClick={() => void toggleShow(show)}>{show.is_published ? 'Unpublish' : 'Publish'}</button></article>) : <p>No podcast shows created yet.</p>}</section>
      <section><h3>Your episodes</h3>{episodes.length ? episodes.map(episode => <article key={episode.id}><div><strong>{episode.title}</strong><small>{shows.find(show => show.id === episode.show_id)?.title || 'Podcast'} · {episode.is_published ? 'Published' : 'Draft'}</small></div><button disabled={busy} onClick={() => void toggleEpisode(episode)}>{episode.is_published ? 'Unpublish' : 'Publish'}</button><button disabled={busy} onClick={() => void deleteEpisode(episode)}>Delete</button></article>) : <p>No episodes created yet.</p>}</section>
      <section><h3>Create a radio station</h3><form onSubmit={createStation}>
        <label>Station name<input value={stationName} onChange={event => setStationName(event.target.value)} required maxLength={80} /></label>
        <label>Genre<input value={stationGenre} onChange={event => setStationGenre(event.target.value)} required maxLength={60} /></label>
        <label>Description<textarea value={stationDescription} onChange={event => setStationDescription(event.target.value)} rows={3} /></label>
        <button disabled={busy}>Create station</button>
      </form></section>
      <section><h3>Your stations</h3>{stations.length ? stations.map(station => <article key={station.id}><div><strong>{station.name}</strong><small>{station.genre} · {station.is_active ? 'Live' : 'Paused'}</small></div><button disabled={busy} onClick={() => void toggleStation(station)}>{station.is_active ? 'Pause' : 'Activate'}</button><button disabled={busy} onClick={() => void deleteStation(station)}>Delete</button></article>) : <p>No radio stations created yet.</p>}</section>
    </div>
    <p className="mcc-note">Use audio you own or are licensed to distribute. This console stores HTTPS audio URLs; it does not upload files or grant streaming rights.</p>
  </div>
}
