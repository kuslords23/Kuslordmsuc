# Royal parent bridge

The Music app owns the only audio element, current track, and playback queue. Royal and SCN are parent surfaces that control it through a constrained `postMessage` bridge.

## Allowed parent origins

Set `VITE_ALLOWED_PARENT_ORIGINS` to a comma-separated list of exact HTTPS origins:

```env
VITE_ALLOWED_PARENT_ORIGINS=https://kus-ai-app.vercel.app,https://sport-clan-nexus.vercel.app
```

Do not use wildcard origins. Local development origins may be added explicitly for local testing.

## Handshake

The parent waits for the iframe to load, then sends `KUS_MUSIC_CONNECT` to the exact Music app origin. The Music app accepts messages only when both `event.source === window.parent` and `event.origin` is in the allowlist. It replies to that same origin with `MUSIC_APP_READY`.

All later parent-to-iframe commands use the exact Music app origin. Music-to-parent messages use the exact origin established by the handshake. No wildcard target origin is used.

## Commands

| Command | Payload | Response |
|---|---|---|
| `KUS_MUSIC_CONNECT` | optional version | `MUSIC_APP_READY`, initial `PLAYBACK_STATE_UPDATE` |
| `GET_STATE` | none | `PLAYBACK_STATE` |
| `GET_TRACKS` | `limit?` | `MUSIC_TRACKS` |
| `SEARCH_TRACKS` | `query`, `limit?` | `MUSIC_SEARCH_RESULTS` |
| `PLAY_TRACK` | `trackId` | `MUSIC_ACTION_RESULT` |
| `SET_QUEUE` / `ADD_TO_QUEUE` | `trackIds` | `MUSIC_ACTION_RESULT` |
| `CLEAR_QUEUE` | none | `MUSIC_ACTION_RESULT` |
| `PLAY` / `RESUME` / `PAUSE` / `TOGGLE_PLAY` | none | action result and player state |
| `NEXT_TRACK` / `PREV_TRACK` | none | action result and player state |
| `SEEK` | `time` in seconds | action result and player state |
| `SET_VOLUME` | `volume` from 0 to 1 | action result and player state |

Track summaries returned to the parent contain only id, title, artist, album, duration, and cover. Audio URLs and account credentials are not exposed through the bridge.

## Security boundaries

- The bridge is a player-control channel, not an authorization channel.
- Search is limited to the tracks already loaded by the Music app for the current session.
- The parent cannot issue payment, purchase, payout, social, message-send, account mutation, or publishing commands.
- User-owned uploads and library changes remain governed by Supabase authentication and RLS.
- Parents must treat a command as successful only after a positive `MUSIC_ACTION_RESULT` or authoritative state update.
