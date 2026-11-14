import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import './CreatorAnalytics.css'

type ReleaseRow = {
  id: string
  sound_title: string | null
  sound_artist: string | null
  listen_count: number | null
  created_at: string
}

type StreamRow = {
  track_post_id: string
  listened_seconds: number | null
  created_at: string
  source: string
}

type ReleaseMetric = ReleaseRow & { verifiedStreams: number; listenedSeconds: number }
type FinanceSummary = {
  ledger_balance_ghs: number | string
  paid_sales_count: number | string
  paid_sales_net_ghs: number | string
  payout_request_count: number | string
}

const number = (value: number) => new Intl.NumberFormat().format(value)
const emptyFinance: FinanceSummary = {
  ledger_balance_ghs: 0,
  paid_sales_count: 0,
  paid_sales_net_ghs: 0,
  payout_request_count: 0,
}

export default function CreatorAnalytics() {
  const [releases, setReleases] = useState<ReleaseMetric[]>([])
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [financeStatus, setFinanceStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (quiet = false) => {
    const client = supabase
    if (!client) {
      setError('Supabase is not configured. Creator analytics require the shared music database.')
      setReleases([])
      setFinance(null)
      setLoading(false)
      return
    }
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('Sign in to view creator analytics.')

      const { data: financeData, error: financeError } = await client.rpc('get_music_creator_financial_summary')
      if (financeError) {
        if (/does not exist|schema cache|could not find the function/i.test(financeError.message)) {
          setFinance(null)
          setFinanceStatus('Creator finance schema is not applied yet. Financial totals will appear after the database migration.')
        } else {
          throw new Error(financeError.message)
        }
      } else {
        const summary = Array.isArray(financeData) ? financeData[0] : financeData
        setFinance((summary || emptyFinance) as FinanceSummary)
        setFinanceStatus('')
      }

      const { data: posts, error: postsError } = await client
        .from('feed_posts')
        .select('id,sound_title,sound_artist,listen_count,created_at')
        .eq('user_id', auth.user.id)
        .eq('post_type', 'audio')
        .order('created_at', { ascending: false })
      if (postsError) throw new Error(postsError.message)
      const rows = (posts || []) as ReleaseRow[]
      if (!rows.length) {
        setReleases([])
        return
      }

      const ids = rows.map((row) => row.id)
      const { data: events, error: eventsError } = await client
        .from('music_stream_events')
        .select('track_post_id,listened_seconds,created_at,source')
        .in('track_post_id', ids)
      if (eventsError) throw new Error(eventsError.message)
      const totals = new Map<string, { count: number; seconds: number }>()
      for (const event of (events || []) as StreamRow[]) {
        const current = totals.get(event.track_post_id) || { count: 0, seconds: 0 }
        current.count += 1
        current.seconds += Number(event.listened_seconds || 0)
        totals.set(event.track_post_id, current)
      }
      setReleases(rows.map((row) => {
        const total = totals.get(row.id) || { count: 0, seconds: 0 }
        return { ...row, verifiedStreams: total.count, listenedSeconds: total.seconds }
      }))
    } catch (cause) {
      setReleases([])
      setError(cause instanceof Error ? cause.message : 'Could not load creator analytics.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const client = supabase
    if (!client) return
    let channel = client.channel('kus-music-creator-analytics')
    channel = channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_posts' }, () => { void refresh(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_stream_events' }, () => { void refresh(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_royalty_ledger' }, () => { void refresh(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_paid_sound_orders' }, () => { void refresh(true) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_creator_payout_requests' }, () => { void refresh(true) })
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [refresh])

  const totals = useMemo(() => {
    const summary = finance || emptyFinance
    return {
      releases: releases.length,
      streams: releases.reduce((sum, row) => sum + row.verifiedStreams, 0),
      seconds: releases.reduce((sum, row) => sum + row.listenedSeconds, 0),
      ledgerBalance: Number(summary.ledger_balance_ghs || 0),
      paidSales: Number(summary.paid_sales_net_ghs || 0),
      paidSaleCount: Number(summary.paid_sales_count || 0),
      payoutCount: Number(summary.payout_request_count || 0),
    }
  }, [releases, finance])

  return (
    <section className="creator-analytics">
      <div className="creator-analytics-heading">
        <div>
          <h3>Creator performance</h3>
          <p>Recorded listening activity from the shared SCN music records</p>
        </div>
        <button type="button" onClick={() => void refresh(true)} disabled={loading || refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      {loading ? <p className="creator-analytics-state">Loading live creator data…</p>
        : error ? <p className="creator-analytics-error" role="alert">{error}</p>
        : <>
          <div className="creator-analytics-metrics">
            <article><span>Published releases</span><strong>{number(totals.releases)}</strong></article>
            <article><span>Recorded streams</span><strong>{number(totals.streams)}</strong></article>
            <article><span>Listening time</span><strong>{number(Math.round(totals.seconds / 60))} min</strong></article>
          </div>
          <div className="creator-finance-panel">
            <div><span>Creator ledger balance</span><strong>{finance ? `GH₵${totals.ledgerBalance.toFixed(4)}` : 'Not available'}</strong><small>Net confirmed ledger entries. This is not a withdrawable-balance promise.</small></div>
            <div><span>Paid sound sales</span><strong>{finance ? number(totals.paidSaleCount) : 'Not available'}</strong><small>{finance ? `GH₵${totals.paidSales.toFixed(2)} creator net` : 'Waiting for the finance schema'}</small></div>
            <div><span>Payout requests</span><strong>{finance ? number(totals.payoutCount) : 'Not available'}</strong><small>Requests are not marked paid until provider confirmation.</small></div>
          </div>
          {financeStatus && <p className="creator-analytics-state">{financeStatus}</p>}
          {releases.length ? <div className="creator-analytics-table">
            <div className="creator-analytics-row creator-analytics-header"><span>Release</span><span>Recorded streams</span><span>SCN listen count</span></div>
            {releases.map((release) => <div className="creator-analytics-row" key={release.id}>
              <span><strong>{release.sound_title?.trim() || 'Untitled release'}</strong><small>{release.sound_artist?.trim() || 'Artist not specified'}</small></span>
              <span>{number(release.verifiedStreams)}</span>
              <span>{number(Number(release.listen_count || 0))}</span>
            </div>)}
          </div> : <p className="creator-analytics-state">No published audio releases belong to this account yet. Upload a release to start collecting verified listening data.</p>}
          <p className="creator-analytics-note">Listening totals include shared SCN stream-event history. Only completed server-timed playback sessions can create Kus-Lords royalty entries. Financial totals come from a database-side aggregate over the append-only ledger. Checkout and payouts remain unavailable until a real provider is connected.</p>
        </>}
    </section>
  )
}
