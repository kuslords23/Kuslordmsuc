import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        // Demo sign in for sandbox
        setSuccessMsg('Signed in as demo user.')
        setTimeout(() => onClose(), 800)
        return
      }

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split('@')[0] },
          },
        })
        if (error) throw error
        setSuccessMsg('Account created! Please check your email to verify.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setSuccessMsg('Signed in successfully!')
        setTimeout(() => onClose(), 600)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoSignIn = async () => {
    setEmail('kuslord.music@example.com')
    setPassword('kuslords-royalty-2025')
    setSuccessMsg('Demo credentials applied. Click Sign In.')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="logo-mark small">𝄞</div>
          <h2>{isSignUp ? 'Join Kus-lords Harmony' : 'Welcome Back'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <p className="modal-subtitle">
          {isSignUp
            ? 'Create an account to save playlists and upload tracks to Kus-lords Royal cloud.'
            : 'Access your royal cloud library, synced tracks, and saved albums.'}
        </p>

        {errorMsg && <div className="alert error">{errorMsg}</div>}
        {successMsg && <div className="alert success">{successMsg}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label>Artist / Display Name</label>
              <input
                type="text"
                placeholder="e.g. Master Kuslord"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Authenticating...' : isSignUp ? 'Create Royal Account' : 'Sign In'}
          </button>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="text-toggle-btn"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg('')
              setSuccessMsg('')
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>

          {!isSupabaseConfigured() && (
            <button type="button" className="demo-btn" onClick={handleDemoSignIn}>
              ⚡ Quick Fill Demo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}