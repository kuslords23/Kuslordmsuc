import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  role: 'member' | 'creator' | 'vip'
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  uploadTrackToSupabase: (file: File, coverFile: File | null, meta: { title: string; artist: string; album: string }) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo guest state for preview
      const localGuest = localStorage.getItem('kus_demo_user')
      if (localGuest) {
        try {
          const parsed = JSON.parse(localGuest)
          setProfile(parsed)
        } catch {
          // ignore
        }
      }
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncProfile(session.user)
      }
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        syncProfile(session.user)
      } else {
        setProfile(null)
      }
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const syncProfile = (authUser: User) => {
    const p: UserProfile = {
      id: authUser.id,
      email: authUser.email || '',
      fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kus-lord VIP',
      avatarUrl: authUser.user_metadata?.avatar_url,
      role: (authUser.user_metadata?.role as 'member' | 'creator' | 'vip') || 'vip',
    }
    setProfile(p)
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const demoProfile: UserProfile = {
        id: 'demo-user-1',
        email,
        fullName: email.split('@')[0] || 'Royal User',
        role: 'vip',
      }
      setProfile(demoProfile)
      localStorage.setItem('kus_demo_user', JSON.stringify(demoProfile))
      return { error: null }
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) {
      const demoProfile: UserProfile = {
        id: 'demo-user-1',
        email,
        fullName: fullName || email.split('@')[0],
        role: 'vip',
      }
      setProfile(demoProfile)
      localStorage.setItem('kus_demo_user', JSON.stringify(demoProfile))
      return { error: null }
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'creator',
        },
      },
    })
    return { error }
  }

  const signInWithMagicLink = async (email: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase URL/Key not configured yet. Using local demo mode.') }
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Google OAuth requires Supabase configuration.') }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signOut = async () => {
    localStorage.removeItem('kus_demo_user')
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  const uploadTrackToSupabase = async (
    file: File,
    coverFile: File | null,
    meta: { title: string; artist: string; album: string }
  ) => {
    if (!isSupabaseConfigured) {
      // Local fallback blob storage for immediate testing
      const audioUrl = URL.createObjectURL(file)
      let coverUrl = 'linear-gradient(135deg, #d4af37, #1a1a24)'
      if (coverFile) {
        coverUrl = URL.createObjectURL(coverFile)
      }

      const customTrack = {
        id: `uploaded-${Date.now()}`,
        title: meta.title || file.name.replace(/\.[^/.]+$/, ''),
        artist: meta.artist || profile?.fullName || 'Kus-lord Artist',
        album: meta.album || 'Personal Releases',
        duration: 210,
        audioUrl,
        cover: coverUrl,
      }

      const stored = localStorage.getItem('kus_custom_tracks')
      const tracks = stored ? JSON.parse(stored) : []
      tracks.unshift(customTrack)
      localStorage.setItem('kus_custom_tracks', JSON.stringify(tracks))
      window.dispatchEvent(new Event('kus_tracks_updated'))
      return { success: true }
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `tracks/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('music-audio')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl: audioPublicUrl } } = supabase.storage
        .from('music-audio')
        .getPublicUrl(filePath)

      let coverPublicUrl = 'linear-gradient(135deg, #d4af37, #1a1a24)'
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverName = `${Date.now()}-cover.${coverExt}`
        const coverPath = `covers/${coverName}`
        const { error: coverErr } = await supabase.storage
          .from('music-covers')
          .upload(coverPath, coverFile)

        if (!coverErr) {
          const { data: { publicUrl } } = supabase.storage
            .from('music-covers')
            .getPublicUrl(coverPath)
          coverPublicUrl = publicUrl
        }
      }

      // Save row in music_tracks table
      const { error: dbError } = await supabase.from('music_tracks').insert([
        {
          title: meta.title || file.name,
          artist: meta.artist || profile?.fullName || 'Kus-lord Artist',
          album: meta.album || 'Royal Exclusives',
          audio_url: audioPublicUrl,
          cover_url: coverPublicUrl,
          duration: 240,
          user_id: user?.id,
        },
      ])

      if (dbError) {
        console.warn('DB insert notice (table might not exist yet):', dbError.message)
      }

      window.dispatchEvent(new Event('kus_tracks_updated'))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Upload failed' }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithMagicLink,
        signInWithGoogle,
        signOut,
        uploadTrackToSupabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}