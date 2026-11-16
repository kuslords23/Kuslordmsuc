import { supabase } from './supabase'

export type MusicSettings = {
  appearance: { theme: 'dark' | 'light' }
  playback: { autoplay: boolean; crossfade: boolean; gapless: boolean; defaultVolume: number; audioQuality: 'data-saver' | 'standard' | 'high' }
  privacy: { saveListeningHistory: boolean; personalizedDiscovery: boolean; shareActivityWithRoyal: boolean }
  notifications: { newReleases: boolean; playlistUpdates: boolean; creatorUpdates: boolean; productNews: boolean }
  studio: { defaultBpm: number; metronomeOnOpen: boolean; autosave: boolean }
  royal: { proactiveSuggestions: boolean; useCurrentTrackContext: boolean; confirmBeforeActions: boolean }
}
export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  appearance: { theme: 'dark' },
  playback: { autoplay: false, crossfade: false, gapless: true, defaultVolume: 80, audioQuality: 'standard' },
  privacy: { saveListeningHistory: true, personalizedDiscovery: true, shareActivityWithRoyal: false },
  notifications: { newReleases: true, playlistUpdates: true, creatorUpdates: true, productNews: false },
  studio: { defaultBpm: 120, metronomeOnOpen: false, autosave: true },
  royal: { proactiveSuggestions: true, useCurrentTrackContext: true, confirmBeforeActions: true },
}
const LOCAL_KEY = 'kus-music-settings-v1'
const mergeSettings = (value: Partial<MusicSettings> | null | undefined): MusicSettings => ({
  appearance: { ...DEFAULT_MUSIC_SETTINGS.appearance, ...value?.appearance },
  playback: { ...DEFAULT_MUSIC_SETTINGS.playback, ...value?.playback },
  privacy: { ...DEFAULT_MUSIC_SETTINGS.privacy, ...value?.privacy },
  notifications: { ...DEFAULT_MUSIC_SETTINGS.notifications, ...value?.notifications },
  studio: { ...DEFAULT_MUSIC_SETTINGS.studio, ...value?.studio },
  royal: { ...DEFAULT_MUSIC_SETTINGS.royal, ...value?.royal },
})
export function readLocalMusicSettings(): MusicSettings {
  try { return mergeSettings(JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null')) } catch { return DEFAULT_MUSIC_SETTINGS }
}
export function applyMusicTheme(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
export async function loadMusicSettings(): Promise<MusicSettings> {
  const local = readLocalMusicSettings()
  if (!supabase) return local
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return local
  const { data, error } = await supabase.from('music_user_settings').select('settings').eq('user_id', auth.user.id).maybeSingle()
  if (error) throw new Error(error.message)
  const merged = mergeSettings((data?.settings || null) as Partial<MusicSettings> | null)
  localStorage.setItem(LOCAL_KEY, JSON.stringify(merged))
  return merged
}
export async function saveMusicSettings(settings: MusicSettings): Promise<'cloud' | 'local'> {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(settings))
  if (!supabase) return 'local'
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!auth.user) return 'local'
  const { error } = await supabase.from('music_user_settings').upsert(
    { user_id: auth.user.id, settings, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
  return 'cloud'
}
