import { useEffect, useState } from 'react'

type MusicVideo = {
  id: string
  title: string
  artist: string
  coverUrl: string
  embedUrl: string
  openUrl: string
  platform: string
}

type SearchResponse = {
  items?: Array<MusicVideo & { kind?: string }>
  hint?: string
}

export default function MusicVideos() {
  const [query, setQuery] = useState('official music video')
  const [videos, setVideos] = useState<MusicVideo[]>([])
  const [selected, setSelected] = useState<MusicVideo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setVideos([])
      setSelected(null)
      setError('Search for an artist, song or music video.')
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      fetch(`/api/music/search?q=${encodeURIComponent(term)}&limit=24`)
        .then(async (response) => {
          const data = await response.json() as SearchResponse
          if (!response.ok) throw new Error(data.hint || 'Music video search failed.')
          return data
        })
        .then((data) => {
          if (cancelled) return
          const results = (data.items || []).filter((item) =>
            item.platform === 'YouTube' && item.embedUrl && item.openUrl,
          )
          setVideos(results)
          setSelected(null)
          if (!results.length) {
            setError(data.hint || 'No embeddable music videos were returned. YouTube search must be enabled by the app administrator.')
          }
        })
        .catch((cause) => {
          if (!cancelled) {
            setVideos([])
            setError(cause instanceof Error ? cause.message : 'Music video search is unavailable.')
          }
        })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="tab-scroll music-videos-page">
      <section className="videos-hero">
        <span className="videos-eyebrow">KUS-LORDS MUSIC</span>
        <h1>Music Videos</h1>
        <p>Discover official music videos and watch them through their authorized player.</p>
        <label className="videos-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search artists, songs and videos"
            aria-label="Search music videos"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
        </label>
      </section>

      {selected && (
        <section className="video-feature">
          <div className="video-player-frame">
            <iframe
              key={selected.id}
              src={selected.embedUrl}
              title={selected.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="video-feature-meta">
            <div><h2>{selected.title}</h2><p>{selected.artist}</p></div>
            <a href={selected.openUrl} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
          </div>
        </section>
      )}

      <div className="section-title">
        <h2>{selected ? 'More music videos' : 'Discover videos'}</h2>
        <span className="caption">Official YouTube results</span>
      </div>
      {loading && <div className="empty">Finding music videos…</div>}
      {error && !loading && <div className="empty">{error}</div>}
      {!!videos.length && (
        <div className="music-video-grid">
          {videos.map((video) => (
            <button
              type="button"
              className={`music-video-card ${selected?.id === video.id ? 'selected' : ''}`}
              key={video.id}
              onClick={() => { setSelected(video); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              <span className="music-video-thumb">
                {video.coverUrl ? <img src={video.coverUrl} alt="" loading="lazy" /> : <span className="video-thumb-fallback">♪</span>}
                <span className="video-play-mark">▶</span>
              </span>
              <span className="music-video-copy"><strong>{video.title}</strong><small>{video.artist}</small></span>
            </button>
          ))}
        </div>
      )}
      <p className="videos-provider-note">Videos are streamed by YouTube's official player. Availability and playback are controlled by YouTube and each video's embedding permissions.</p>
    </div>
  )
}
