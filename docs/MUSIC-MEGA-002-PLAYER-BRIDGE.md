# MUSIC-MEGA-002: Player Reliability and Companion Bridge

Status: implementation in progress  
Target: `kuslords23/Kuslordmsuc`  
Working branch: `feat/music-mega-002-player-bridge`

## Objective

Finish the standalone Music app's player-side responsibilities without moving Royal intelligence or KUS Core orchestration into this repository. Kus-Lords Music remains the owner of playback and music data. Royal remains a separate consumer of the approved cross-origin bridge.

## Changes in this batch

- Playback requests now await the browser's `HTMLMediaElement.play()` promise before reporting success.
- Audio source errors and rejected playback attempts are reflected in player state and surfaced accessibly in the desktop player.
- Parent bridge track summaries omit raw audio URLs. Royal receives catalogue metadata and stable identifiers, not direct media source URLs.
- `LIKE_TRACK` accepts an explicit `liked: boolean` desired state. This makes retries safe. The legacy toggle behaviour remains available when that field is omitted.
- Playback state includes a non-sensitive playback error string when a source cannot start.
- Transport and queue commands return explicit action receipts. Invalid volume/seek values and unknown track IDs are rejected rather than silently ignored.
- `CLEAR_QUEUE` now clears the queue instead of silently retaining the current track in it.
- Existing origin checks, comment confirmation, Supabase session-derived comment author identity, and single-player architecture are preserved.

## Bridge command contract

| Command | Input | Result |
|---|---|---|
| `SEARCH_TRACKS` | `query`, optional `limit` | `MUSIC_SEARCH_RESULTS` with safe track summaries |
| `GET_TRACKS` | optional `limit` | `MUSIC_TRACKS` with safe track summaries |
| `PLAY_TRACK` | `trackId` | `MUSIC_ACTION_RESULT`; `ok` reflects browser playback start |
| `SET_QUEUE` / `ADD_TO_QUEUE` | `trackIds` | Validates every requested ID and returns the resulting queue |
| `CLEAR_QUEUE` | none | Clears queue and returns an empty queue |
| `PLAY` / `RESUME` / `PAUSE` | none | Returns an action receipt |
| `NEXT_TRACK` / `PREV_TRACK` | none | Returns an action receipt after attempting playback |
| `SEEK` | `time` | Rejects values outside the known track duration |
| `SET_VOLUME` | `volume` from 0 to 1 | Returns an action receipt |
| `LIKE_TRACK` | `trackId`, optional desired `liked` | Session-local state; no claim of durable likes |
| `GET_COMMENTS` | `trackId` | Reads comments for published audio posts |
| `POST_COMMENT` | `trackId`, `text`, `confirmed: true` | Requires explicit confirmation and authenticated Supabase session |
| `GET_STATE` | none | Returns playback state and queue identifiers |

Track summaries intentionally exclude audio URLs, storage paths, access tokens, and credentials. This iframe bridge is an origin-checked UI control channel, not an authentication boundary for database access and not a replacement for Guardian approval in the KUS AI app.

## Verification

The new `verify:music:mega-002` script checks the key source contracts. GitHub Actions runs both the MUSIC-MEGA-001 regression verifier and the new batch verifier, followed by a Vite production build.

A passing static check and CI build do not prove live Supabase RLS behaviour, mobile browser autoplay behaviour, or a deployed cross-origin Royal handshake. Those require separate runtime verification. No Supabase migration is introduced in this batch.
