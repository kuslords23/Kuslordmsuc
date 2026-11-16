export type ExternalPlaybackItem = {
  id: string
  title: string
  artist: string
  coverUrl: string
  embedUrl: string
  openUrl: string
  platform: string
  kind: "track" | "artist" | "album" | "playlist"
  duration?: number
}

type Props = { item: ExternalPlaybackItem; onClose: () => void }

export default function ExternalPlayerDock({ item, onClose }: Props) {
  const compact = item.kind === "track" && /spotify/i.test(item.platform)
  return (
    <section className="kus-external-player" aria-label="External music player">
      <div className="kus-external-player-head">
        {item.coverUrl ? <img src={item.coverUrl} alt="" /> : <span className="kus-external-art">♫</span>}
        <div className="kus-external-meta">
          <strong>{item.title}</strong>
          <span>{item.artist} · {item.platform}</span>
          <small>Playing through the official {item.platform} player</small>
        </div>
        <a href={item.openUrl} target="_blank" rel="noopener noreferrer">Open ↗</a>
        <button type="button" onClick={onClose} aria-label="Close external player">×</button>
      </div>
      <div className={`kus-external-player-frame ${compact ? "compact" : ""}`}>
        <iframe
          key={item.id}
          title={item.title + " on " + item.platform}
          src={item.embedUrl}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <p>Playback stays with the provider's authorized player. Kus-Lords Music keeps this player available as you move between sections.</p>
    </section>
  )
}
