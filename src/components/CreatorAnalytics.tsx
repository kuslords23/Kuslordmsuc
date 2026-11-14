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
type RoyaltyRow = { amount_ghs: number | string; currency: string; created_at: string }
type PayoutRow = { amount_ghs: number | string; status: string; requested_at: string }
type SaleRow = { creator_net_ghs: number | string; status: string; created_at: string }

const number = (value: number) => new Intl.NumberFormat().format(value)

export default function CreatorAnalytics() {
  const [releases, setReleases] = useState<ReleaseMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [royalties, setRoyalties] = useState<RoyaltyRow[]>([])
  const [payouts, setPayouts] = useState<PayoutRow[]>([])
  const [sales, setSales] = useState<SaleRow[]>([])

  const refresh = useCallback(async (quiet = false) => {
    const client = supabase
    if (!client) {
      setError('Supabase is not configured. Creator analytics require the shared music database.')
      setReleases([])
      setLoading(false)
      return
    }
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const { data: auth, error: authError } = await client.auth.getUser()
      if (authError || !auth.user) throw new Error('Sign in to view creator analytics.')
      const [royaltyResult, payoutResult, salesResult] = await Promise.all([
        client.from('music_royalty_ledger').select('amount_ghs,currency,created_at').eq('creator_user_id', auth.user.id).order('created_at', { ascending: false }).limit(500),
        client.from('music_creator_payout_requests').select('amount_ghs,status,requested_at').eq('creator_user_id', auth.user.id).order('requested_at', { ascending: false }).limit(100),
        client.from('music_paid_sound_orders').select('creator_net_ghs,status,created_at').eq('creator_user_id', auth.user.id).order('created_at', { ascending: false }).limit(100),
      ])
      if (royaltyResult.error && !/does not exist|schema cache/i.test(royaltyResult.error.message)) throw new Error(royaltyResult.error.message)
      if (payoutResult.error && !/does not exist|schema cache/i.test(payoutResult.error.message)) throw new Error(payoutResult.error.message)
      if (salesResult.error && !/does not exist|schema cache/i.test(salesResult.error.message)) throw new Error(salesResult.error.message)
      setRoyalties((royaltyResult.data || []) as RoyaltyRow[])
      setPayouts((payoutResult.data || []) as PayoutRow[])
      setSales((salesResult.data || []) as SaleRow[])
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
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [refresh])

  const totals = useMemo(() => ({
    releases: releases.length,
    streams: releases.reduce((sum, row) => sum + row.verifiedStreams, 0),
    seconds: releases.reduce((sum, row) => sum + row.listenedSeconds, 0),
    royalties: royalties.reduce((sum, row) => sum + Number(row.creator_net_ghs || 0), 0),
    paidSales: sales.filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.amount_ghs || 0), 0),
    paidSaleCount: sales.filter((row) => row.status === 'paid').length,
    payoutCount: payouts.length,
  }), [releases, royalties, sales, payouts])

  return (
    <section className="creator-analytics">
      <div className="creator-analytics-heading">
        <div>
          <h3>Creator performance</h3>
          <p>Verified listening activity from the shared SCN music records</p>
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
            <article><span>Verified streams</span><strong>{number(totals.streams)}</strong></article>
            <article><span>Listening time</span><strong>{number(Math.round(totals.seconds / 60))} min</strong></article>
          </div>
          <div className="creator-finance-panel">
            <div><span>Creator ledger balance</span><strong>GH₵{totals.royalties.toFixed(4)}</strong><small>Net confirmed ledger entries. This is not a withdrawable-balance promise.</small></div>
            <div><span>Paid sound sales</span><strong>{totals.paidSaleCount}</strong><small>GH₵{totals.paidSales.toFixed(2)} confirmed by provider webhooks</small></div>
            <div><span>Payout requests</span><strong>{totals.payoutCount}</strong><small>Requests are not marked paid until provider confirmation.</small></div>
          </div>
          {releases.length ? <div className="creator-analytics-table">
            <div className="creator-analytics-row creator-analytics-header"><span>Release</span><span>Verified streams</span><span>SCN listen count</span></div>
            {releases.map((release) => <div className="creator-analytics-row" key={release.id}>
              <span><strong>{release.sound_title?.trim() || 'Untitled release'}</strong><small>{release.sound_artist?.trim() || 'Artist not specified'}</small></span>
              <span>{number(release.verifiedStreams)}</span>
              <span>{number(Number(release.listen_count || 0))}</span>
            </div>)}
          </div> : <p className="creator-analytics-state">No published audio releases belong to this account yet. Upload a release to start collecting verified listening data.</p>}
          <p className="creator-analytics-note">Stream totals come from database-recorded events. Royalties come only from the append-only ledger; checkout and payouts remain unavailable until a real provider is connected.</p>
        </>}
    </section>
  )
}
