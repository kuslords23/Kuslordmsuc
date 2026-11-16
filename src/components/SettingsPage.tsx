import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { applyMusicTheme, DEFAULT_MUSIC_SETTINGS, loadMusicSettings, saveMusicSettings, type MusicSettings } from '../lib/userSettings'
import './SettingsPage.css'

type Section = 'appearance' | 'playback' | 'privacy' | 'notifications' | 'studio' | 'royal' | 'account'
const sections: { id: Section; icon: string; title: string; detail: string }[] = [
  { id: 'appearance', icon: '◐', title: 'Appearance', detail: 'Light and dark mode' },
  { id: 'playback', icon: '♫', title: 'Playback', detail: 'Audio quality and player behaviour' },
  { id: 'privacy', icon: '◈', title: 'Privacy', detail: 'History and personalisation' },
  { id: 'notifications', icon: '♧', title: 'Notifications', detail: 'Choose what you hear about' },
  { id: 'studio', icon: '🎛', title: 'Studio', detail: 'Your creation defaults' },
  { id: 'royal', icon: '♛', title: 'Royal', detail: 'Companion context and assistance' },
  { id: 'account', icon: '◎', title: 'Account', detail: 'Signed-in account information' },
]
export default function SettingsPage() {
  const { user } = useAuth()
  const [section, setSection] = useState<Section>('appearance')
  const [settings, setSettings] = useState<MusicSettings>(DEFAULT_MUSIC_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    loadMusicSettings().then(value => { if (alive) { setSettings(value); applyMusicTheme(value.appearance.theme) } })
      .catch(cause => { if (alive) setError(cause instanceof Error ? cause.message : 'Could not load settings') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [user?.id])
  const update = <K extends keyof MusicSettings>(key: K, patch: Partial<MusicSettings[K]>) => {
    setSettings(current => {
      const next = { ...current, [key]: { ...current[key], ...patch } }
      if (key === 'appearance' && patch.theme) applyMusicTheme(patch.theme as 'dark' | 'light')
      setNotice('Unsaved changes')
      return next
    })
  }
  const save = async () => {
    setSaving(true); setError(''); setNotice('')
    try {
      const destination = await saveMusicSettings(settings)
      setNotice(destination === 'cloud' ? 'Settings saved to your account.' : user ? 'Saved on this device. Cloud settings could not be reached.' : 'Saved on this device. Sign in to sync settings across devices.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save settings') }
    finally { setSaving(false) }
  }
  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void, description?: string) => (
    <label className="settings-toggle-row"><span><strong>{label}</strong>{description && <small>{description}</small>}</span><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><i /></label>
  )
  return <div className="tab-scroll settings-page">
    <header className="settings-heading"><span className="hero-tag">KUS-LORDS MUSIC</span><h1>Settings</h1><p>Shape how your music space looks, sounds and works.</p></header>
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {sections.map(item => <button type="button" key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span className="settings-nav-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><b>›</b></button>)}
      </nav>
      <section className="settings-panel">
        {loading ? <p className="settings-message">Loading your settings…</p> : <>
          {section === 'appearance' && <><h2>Appearance</h2><p className="settings-intro">Choose the look of Kus-Lords Music. Your choice applies immediately.</p><div className="theme-choice-grid">
            {(['dark','light'] as const).map(theme => <button type="button" key={theme} onClick={() => update('appearance',{theme})} className={settings.appearance.theme === theme ? 'selected' : ''}><span className={'theme-preview '+theme}><i/><i/><i/></span><strong>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</strong><small>{theme === 'dark' ? 'Deep tones, low glare' : 'Bright, airy surfaces'}</small>{settings.appearance.theme === theme && <em>Selected</em>}</button>)}
          </div></>}
          {section === 'playback' && <><h2>Playback</h2><p className="settings-intro">Set your listening defaults. Some options are preferences for future player integration.</p>
            {toggle('Autoplay',settings.playback.autoplay,v=>update('playback',{autoplay:v}),'Continue with related music when a queue ends.')}
            {toggle('Gapless playback',settings.playback.gapless,v=>update('playback',{gapless:v}),'Prefer seamless transitions between tracks.')}
            {toggle('Crossfade',settings.playback.crossfade,v=>update('playback',{crossfade:v}),'Enable crossfade when supported by the player.')}
            <label className="settings-field"><span>Default volume</span><strong>{settings.playback.defaultVolume}%</strong><input type="range" min="0" max="100" value={settings.playback.defaultVolume} onChange={e=>update('playback',{defaultVolume:Number(e.target.value)})}/></label>
            <label className="settings-field"><span>Streaming quality</span><select value={settings.playback.audioQuality} onChange={e=>update('playback',{audioQuality:e.target.value as MusicSettings['playback']['audioQuality']})}><option value="data-saver">Data saver</option><option value="standard">Standard</option><option value="high">High quality</option></select></label>
          </>}
          {section === 'privacy' && <><h2>Privacy</h2><p className="settings-intro">Control how your activity is used. These preferences do not change provider-side data collection.</p>
            {toggle('Listening history',settings.privacy.saveListeningHistory,v=>update('privacy',{saveListeningHistory:v}),'Allow Kus-Lords Music to keep your listening history.')}
            {toggle('Personalised discovery',settings.privacy.personalizedDiscovery,v=>update('privacy',{personalizedDiscovery:v}),'Use your in-app activity to shape recommendations.')}
            {toggle('Share activity with Royal',settings.privacy.shareActivityWithRoyal,v=>update('privacy',{shareActivityWithRoyal:v}),'Allow Royal to use your listening activity as context.')}
          </>}
          {section === 'notifications' && <><h2>Notifications</h2><p className="settings-intro">Choose the updates you want Kus-Lords Music to prepare for you.</p>
            {toggle('New releases',settings.notifications.newReleases,v=>update('notifications',{newReleases:v}))}
            {toggle('Playlist updates',settings.notifications.playlistUpdates,v=>update('notifications',{playlistUpdates:v}))}
            {toggle('Creator updates',settings.notifications.creatorUpdates,v=>update('notifications',{creatorUpdates:v}))}
            {toggle('Kus-Lords product news',settings.notifications.productNews,v=>update('notifications',{productNews:v}))}
            <p className="settings-footnote">These preferences are stored now. Push/email delivery requires a notification delivery service and is not activated by these switches alone.</p>
          </>}
          {section === 'studio' && <><h2>Studio</h2><p className="settings-intro">Set your starting point when creating music.</p>
            <label className="settings-field"><span>Default tempo (BPM)</span><input type="number" min="40" max="240" value={settings.studio.defaultBpm} onChange={e=>update('studio',{defaultBpm:Math.min(240,Math.max(40,Number(e.target.value)||120))})}/></label>
            {toggle('Open with metronome',settings.studio.metronomeOnOpen,v=>update('studio',{metronomeOnOpen:v}))}
            {toggle('Autosave projects',settings.studio.autosave,v=>update('studio',{autosave:v}))}
          </>}
          {section === 'royal' && <><h2>Royal companion</h2><p className="settings-intro">Configure how the shared Royal intelligence experience behaves inside Music.</p>
            {toggle('Proactive music suggestions',settings.royal.proactiveSuggestions,v=>update('royal',{proactiveSuggestions:v}))}
            {toggle('Use current track as context',settings.royal.useCurrentTrackContext,v=>update('royal',{useCurrentTrackContext:v}))}
            {toggle('Confirm before actions',settings.royal.confirmBeforeActions,v=>update('royal',{confirmBeforeActions:v}),'Keep explicit confirmation before consequential actions.')}
          </>}
          {section === 'account' && <><h2>Account</h2><p className="settings-intro">Your Kus-Lords Music sign-in identity.</p><div className="settings-account-card"><span>Signed in as</span><strong>{user?.email || 'Guest session'}</strong><small>{user ? 'Your preferences sync to your account when cloud storage is available.' : 'Sign in to sync your settings across devices.'}</small></div></>}
        </>}
        {error && <p className="settings-error" role="alert">{error}</p>}
        {notice && <p className="settings-message" role="status">{notice}</p>}
        <div className="settings-actions"><span>{user ? 'Account preferences' : 'Device preferences'}</span><button type="button" onClick={() => void save()} disabled={loading || saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
      </section>
    </div>
  </div>
}
