import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import "./RoyalCompanion.css"

type TrackContext = { title: string; artist: string; album?: string } | null
type Turn = { role: "user" | "assistant"; content: string }
type Props = { activeTab: string; currentTrack: TrackContext }
type RoyalMeta = { model?: string; provider?: string; mode?: string; usage?: unknown; latencyMs?: number }

const API_FALLBACK = "https://kus-ai-app.vercel.app"

function readMeta(value: Record<string, unknown>): RoyalMeta {
  return {
    model: typeof value.model === "string" ? value.model : undefined,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    mode: typeof value.mode === "string" ? value.mode : undefined,
    usage: value.usage,
    latencyMs: typeof value.latencyMs === "number" ? value.latencyMs : undefined,
  }
}

export default function RoyalCompanion({ activeTab, currentTrack }: Props) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [turns, setTurns] = useState<Turn[]>([])
  const [streamingAnswer, setStreamingAnswer] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [meta, setMeta] = useState<RoyalMeta>({})
  const [showContext, setShowContext] = useState(false)
  const turnsEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const turnsRef = useRef(turns)
  const mountedRef = useRef(true)

  useEffect(() => { turnsRef.current = turns }, [turns])
  useEffect(() => { const openRoyal = () => setOpen(true); window.addEventListener("kus-open-royal", openRoyal); return () => window.removeEventListener("kus-open-royal", openRoyal) }, [])
  useEffect(() => () => {
    mountedRef.current = false
    abortRef.current?.abort()
  }, [])
  useEffect(() => {
    if (open) turnsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [turns, streamingAnswer, open])

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const send = useCallback(async (event?: FormEvent) => {
    event?.preventDefault()
    const text = prompt.trim()
    if (!text || busy) return

    const history = turnsRef.current.slice(-12)
    setTurns((current) => [...current, { role: "user", content: text }])
    turnsRef.current = [...history, { role: "user", content: text }]
    setPrompt("")
    setError("")
    setMeta({})
    setStreamingAnswer("")
    setBusy(true)

    try {
      if (!supabase) throw new Error("Shared KUS account service is not configured.")
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (session.error || !token) throw new Error("Sign in to speak with Royal.")

      const base = (import.meta.env.VITE_ROYAL_API_URL || API_FALLBACK).replace(/\/$/, "")
      const controller = new AbortController()
      abortRef.current = controller
      let streamed = ""
      const response = await fetch(base + "/api/royal/companion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-supabase-auth": token,
          "Accept": "text/event-stream, application/json",
        },
        body: JSON.stringify({
          companionId: "music",
          conversationId: "kus-music-companion",
          prompt: [
            "The user is inside Kus-Lords Music.",
            "Current app section: " + activeTab + ".",
            "Currently selected track: " + (currentTrack ? currentTrack.title + " by " + currentTrack.artist + (currentTrack.album ? " from " + currentTrack.album : "") : "none") + ".",
            "Help with music discovery, listening, playlists, music production, arrangement, mixing, and the Music Studio. Use only capabilities actually available through the shared KUS runtime.",
            "User message: " + text,
          ].join("\n"),
          history,
          mode: "royal",
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string; message?: string }
        throw new Error(body.error || body.message || "Royal could not respond (" + response.status + ").")
      }

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let eventName = "message"
        let finalAnswer = ""
        const handleBlock = (block: string) => {
          let name = eventName
          const dataLines: string[] = []
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) name = line.slice(6).trim()
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim())
          }
          if (!dataLines.length) return
          let data: Record<string, unknown>
          try { data = JSON.parse(dataLines.join("\n")) as Record<string, unknown> } catch { return }
          if (name === "meta") setMeta(readMeta(data))
          if (name === "token") {
            const delta = typeof data.text === "string" ? data.text : ""
            streamed += delta
            if (mountedRef.current) setStreamingAnswer(streamed)
          }
          if (name === "done") {
            finalAnswer = typeof data.answer === "string" ? data.answer : streamed
            setMeta((current) => ({ ...current, ...readMeta(data) }))
          }
          if (name === "error") throw new Error(typeof data.error === "string" ? data.error : "Royal stream failed.")
          eventName = "message"
        }
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let boundary = buffer.indexOf("\n\n")
          while (boundary >= 0) {
            const block = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            handleBlock(block)
            boundary = buffer.indexOf("\n\n")
          }
        }
        buffer += decoder.decode()
        if (buffer.trim()) handleBlock(buffer)
        const answer = (finalAnswer || streamed).trim()
        if (!answer) throw new Error("Royal returned an empty response.")
        if (mountedRef.current) {
          setTurns((current) => [...current, { role: "assistant", content: answer }])
          turnsRef.current = [...turnsRef.current, { role: "assistant", content: answer }]
          setStreamingAnswer("")
        }
      } else {
        const body = await response.json() as Record<string, unknown>
        const answer = typeof body.answer === "string" ? body.answer : typeof body.content === "string" ? body.content : ""
        if (!answer.trim()) throw new Error("Royal returned an empty response.")
        setMeta(readMeta(body))
        setTurns((current) => [...current, { role: "assistant", content: answer }])
        turnsRef.current = [...turnsRef.current, { role: "assistant", content: answer }]
      }
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        // A stopped partial answer is discarded; it is never presented as a completed result.
      } else {
        const message = cause instanceof Error ? cause.message : "Royal is temporarily unavailable."
        if (mountedRef.current) setError(message)
      }
    } finally {
      abortRef.current = null
      if (mountedRef.current) {
        setBusy(false)
        setStreamingAnswer("")
      }
    }
  }, [prompt, busy, activeTab, currentTrack])

  const clearConversation = () => {
    if (busy) return
    setTurns([])
    turnsRef.current = []
    setMeta({})
    setError("")
  }

  return (
    <>
      <button type="button" className="royal-launcher" onClick={() => setOpen(true)} aria-label="Open Royal" title="Talk to Royal">
        <span>♛</span><small>Royal</small>
      </button>
      {open && (
        <section className="royal-companion-fullscreen" role="dialog" aria-modal="true" aria-label="Royal music companion">
          <header className="royal-topbar">
            <div className="royal-brand">
              <span className="royal-brand-mark">♛</span>
              <span><strong>Royal</strong><small>KUS AI · Music companion</small></span>
            </div>
            <div className="royal-top-actions">
              <button type="button" onClick={() => setShowContext((value) => !value)} aria-label="Toggle music context" title="Music context">✦</button>
              <button type="button" onClick={clearConversation} disabled={busy} aria-label="New conversation" title="New conversation">＋</button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close Royal" title="Close">×</button>
            </div>
          </header>
          <div className="royal-status"><span className="royal-status-dot" /> Shared Royal intelligence · OpenRouter routing · KUS Core</div>
          {showContext && (
            <aside className="royal-context-panel">
              <strong>Music context</strong>
              <span>Section: {activeTab}</span>
              <span>Track: {currentTrack ? currentTrack.title + " · " + currentTrack.artist : "Nothing selected"}</span>
              <small>Royal receives this music context with your prompt. Your private music data remains subject to KUS Core identity and access controls.</small>
            </aside>
          )}
          <main className="royal-transcript" aria-live="polite">
            {!turns.length && !streamingAnswer && (
              <div className="royal-welcome">
                <span>✦</span>
                <h1>What shall we create?</h1>
                <p>Explore music, shape playlists, analyse a track, build a beat, or work through an idea in the Music Studio.</p>
                <div className="royal-starters">
                  {["Help me discover music for my mood", "Help me build an Afrobeats rhythm", "Give me ideas for a new song"].map((item) => (
                    <button key={item} type="button" onClick={() => setPrompt(item)}>{item}</button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn, index) => (
              <article key={index + "-" + turn.role} className={"royal-turn " + turn.role}>
                {turn.role === "assistant" && <small>✦ Royal</small>}
                <p>{turn.content}</p>
              </article>
            ))}
            {streamingAnswer && <article className="royal-turn assistant streaming"><small>✦ Royal · responding</small><p>{streamingAnswer}</p></article>}
            {busy && !streamingAnswer && <div className="royal-thinking">Royal is thinking…</div>}
            {error && <div className="royal-error" role="alert">{error}</div>}
            <div ref={turnsEndRef} />
          </main>
          <footer className="royal-compose-area">
            <div className="royal-telemetry">
              <span>{meta.provider || "Shared provider routing"}{meta.model ? " · " + meta.model : ""}</span>
              {meta.mode && <span>{meta.mode}</span>}
              {meta.latencyMs !== undefined && <span>{meta.latencyMs} ms</span>}
            </div>
            <form className="royal-compose" onSubmit={(event) => void send(event)}>
              <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={2} placeholder="Message Royal about music…" aria-label="Message Royal" disabled={busy} />
              {busy
                ? <button type="button" onClick={stop} aria-label="Stop response" title="Stop response">■</button>
                : <button type="submit" disabled={!prompt.trim()} aria-label="Send to Royal" title="Send">➤</button>}
            </form>
            <p className="royal-footnote">Your message is sent only when you press send. Drafts are not auto-submitted. Protected actions remain under Guardian approval.</p>
          </footer>
        </section>
      )}
    </>
  )
}

function streamedFallback(): boolean {
  return true
}
