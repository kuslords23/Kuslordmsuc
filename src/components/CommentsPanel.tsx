import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Track } from '../data/music'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type MusicComment = {
  id: string
  post_id: string
  user_id: string
  user_name: string
  user_avatar?: string | null
  body: string
  created_at: string
}

interface CommentsPanelProps {
  track: Track | null
  user: User | null
  onClose: () => void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function CommentsPanel({ track, user, onClose }: CommentsPanelProps) {
  const postId = track?.postId || track?.id || ''
  const [comments, setComments] = useState<MusicComment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!track || !UUID_RE.test(postId) || !isSupabaseConfigured() || !supabase) {
      setComments([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setError('')
    supabase.from('feed_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }).limit(200)
      .then(({ data, error: queryError }) => {
        if (!alive) return
        if (queryError) setError(queryError.message)
        else setComments((data || []) as MusicComment[])
        setLoading(false)
      })
    const channel = supabase.channel(`music-comments-${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_comments', filter: `post_id=eq.${postId}` }, (payload) => {
        const next = payload.new as MusicComment
        if (next?.id) setComments((previous) => previous.some((item) => item.id === next.id) ? previous : [...previous, next])
      })
      .subscribe()
    return () => {
      alive = false
      if (supabase) void supabase.removeChannel(channel)
    }
  }, [track?.id, postId])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = text.trim()
    if (!body || submitting) return
    if (!user || !supabase) {
      setError('Sign in to comment.')
      return
    }
    if (!UUID_RE.test(postId)) {
      setError('Comments are available for published audio posts only.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session || session.user.id !== user.id) {
        setError('Your music session is not valid. Sign in again.')
        return
      }
      const userName = String(user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kus-lord')
      const userAvatar = String(user.user_metadata?.avatar_url || user.user_metadata?.avatar || '👑')
      const { data, error: insertError } = await supabase.from('feed_comments').insert({
        post_id: postId,
        user_id: session.user.id,
        user_name: userName,
        user_avatar: userAvatar,
        body,
        comment_type: 'text',
      }).select('*').single()
      if (insertError || !data) {
        setError(insertError?.message || 'Could not publish comment.')
        return
      }
      const saved = data as MusicComment
      setComments((previous) => previous.some((item) => item.id === saved.id) ? previous : [...previous, saved])
      setText('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish comment.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!track) return null

  return (
    <div className="music-comments-overlay" onClick={onClose}>
      <section className="music-comments-panel" role="dialog" aria-modal="true" aria-label={`Comments for ${track.title}`} onClick={(event) => event.stopPropagation()}>
        <header className="music-comments-header">
          <div><strong>Comments</strong><span>{track.title} · {comments.length}</span></div>
          <button type="button" onClick={onClose} aria-label="Close comments">✕</button>
        </header>
        <div className="music-comments-list">
          {!UUID_RE.test(postId) && <p className="empty">Comments are available for published audio posts.</p>}
          {loading && <p className="empty">Loading comments…</p>}
          {!loading && UUID_RE.test(postId) && comments.length === 0 && <p className="empty">No comments yet. Start the conversation.</p>}
          {comments.map((comment) => (
            <article key={comment.id} className="music-comment">
              <span className="music-comment-avatar">{comment.user_avatar || '👑'}</span>
              <div><strong>{comment.user_name}</strong><p>{comment.body}</p><small>{new Date(comment.created_at).toLocaleString()}</small></div>
            </article>
          ))}
        </div>
        <form className="music-comment-form" onSubmit={submit}>
          {error && <p role="alert" className="music-comment-error">{error}</p>}
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={user ? 'Write a comment…' : 'Sign in to comment'} rows={2} maxLength={2000} disabled={!user || !UUID_RE.test(postId) || submitting} />
          <button type="submit" disabled={!user || !UUID_RE.test(postId) || !text.trim() || submitting}>{submitting ? 'Posting…' : 'Post comment'}</button>
        </form>
      </section>
    </div>
  )
}
