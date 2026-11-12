import fs from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const app = read('../src/App.tsx')
const player = read('../src/components/PlayerBar.tsx')

assert.match(app, /event\\.source !== window\\.parent/, 'bridge must verify the parent window')
assert.match(app, /allowedParentOrigins\\.has\\(event\\.origin\\)/, 'bridge must enforce the exact parent origin allowlist')
assert.doesNotMatch(app, /audioUrl:\\s*track\\.audioUrl/, 'bridge summaries must not expose raw audio URLs')
assert.match(app, /await audio\\.play\\(\\)/, 'playback must await the browser playback result')
assert.match(app, /Promise<boolean>/, 'player operations must return an actual success result')
assert.match(app, /handleAudioError/, 'audio element errors must be handled')
assert.match(app, /setPlaybackError\\(/, 'playback failures must be surfaced to the UI')
assert.match(app, /typeof payload\\?\\.liked === 'boolean'/, 'LIKE_TRACK must support idempotent desired-state requests')
assert.match(app, /payload\\?\\.confirmed !== true/, 'comment publishing must retain explicit confirmation')
assert.match(app, /audioDuration > 0 && payload\\?\\.time <= audioDuration/, 'seek requests must be bounded by track duration')
assert.match(app, /missingTrackIds: missing/, 'queue updates must reject unknown track IDs rather than silently dropping them')
assert.match(app, /queue: \\[\\]/, 'CLEAR_QUEUE must return an empty queue')
assert.match(player, /aria-live="polite"/, 'player must announce playback errors accessibly')

console.log('MUSIC-MEGA-002 source checks passed.')
