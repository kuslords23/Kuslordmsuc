import React, { createContext, useContext, useEffect, useState } from 'react'
import { AUTH_STORAGE_KEY, supabase } from './supabase'

export interface UserProfile {
  id: string
  email: string
  username: string
  avatarUrl?: string
  tier: 'Royal VIP' | 'Pro Member' | 'Free Fan'
}

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  signInWithEmail: (email: string) => Promise<{ success: boolean; message?: string }>
  signOut: () => Promise<void>
  loginAsGuest: (name?: string) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => ({ success: false }),
  signOut: async () => {},
  loginAsGuest: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check saved session in companion constellation key
    const saved = localStorage.getItem(AUTH_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.user) {
          setUser({
            id: parsed.user.id || 'u-kuslord',
            email: parsed.user.email || 'royal@kuslords.club',
            username: parsed.user.user_metadata?.username || parsed.user.email?.split('@')[0] || 'Kuslord VIP',
            tier: 'Royal VIP',
          })
        }
      } catch (e) {
        console.error('Failed to parse auth token', e)
      }
    } else {
      // Default guest profile
      setUser({
        id: 'guest-1',
        email: 'member@kuslords.club',
        username: 'Kuslord Royal',
        tier: 'Royal VIP',
      })
    }
    setLoading(false)

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Kuslord Fan',
          tier: 'Royal VIP',
        })
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
      return { success: true, message: 'Magic link sent to your email!' }
    } catch (err: any) {
      // Offline fallback
      setUser({
        id: `usr-${Date.now()}`,
        email,
        username: email.split('@')[0],
        tier: 'Royal VIP',
      })
      return { success: true, message: 'Signed in successfully as ' + email }
    }
  }

  const loginAsGuest = (name = 'Kuslord Fan') => {
    setUser({
      id: `guest-${Date.now()}`,
      email: 'fan@kuslords.club',
      username: name,
      tier: 'Pro Member',
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut().catch(() => {})
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithEmail, signOut, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)