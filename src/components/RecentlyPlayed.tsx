import type { MusicHistoryEntry } from '../lib/musicHistory'

interface RecentlyPlayedProps {
  entries: MusicHistoryEntry[]
  onPlayKus: (entry: MusicHistoryEntry) => void
  onPlayExternal: (entry: MusicHistoryEntry) => void
}

export default function RecentlyPlayed({ entries, onPlayKus, onPlayExternal }: RecentlyPlayedProps) {
  return <section className="recently-played-section">
    <div className="section-title"><h2>Recently played</h2><span className="caption">Saved on this device · latest 50</span></div>
    {entries.length ? <div className="track-list-compact">
      {entries.map(entry => {
        const title = entry.track?.title || entry.external?.title || 'Unknown track'
        const artist = entry.track?.artist || entry.external?.artist || ''
        const cover = entry.track?.cover || entry.external?.coverUrl || ''
        const provider = entry.source === 'kus' ? 'KUS Music' : entry.external?.platform || 'External'
        return <div className="track-row-compact" key={entry.key}>
          {cover.startsWith('http') ? <img className="mini-cover" src={cover} alt="" /> : <span className="mini-cover">♫</span>}
          <span className="track-meta"><strong>{title}</strong><span>{artist} · {provider}</span></span>
          <button type="button" className="history-play-button" onClick={() => entry.source === 'kus' ? onPlayKus(entry) : onPlayExternal(entry)} aria-label={'Play ' + title + ' again'}>▶</button>
        </div>
      })}
    </div> : <div className="empty">Songs you play from KUS Music or open in an official provider player will appear here.</div>}
  </section>
}
