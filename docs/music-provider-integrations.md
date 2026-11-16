# Music provider integrations: Audiomack, Boomplay and ReverbNation

This change adds server-side integration entry points without inventing undocumented provider protocols.

## Audiomack

Endpoint: `GET /api/music/audiomack?action=search&q=...`

Other actions:
- `GET /api/music/audiomack?action=trending`
- `POST /api/music/audiomack?action=play&id={numeric-track-id}`

Configure server-only Vercel environment variables:
- `AUDIOMACK_CONSUMER_KEY`
- `AUDIOMACK_CONSUMER_SECRET`

The adapter signs requests with OAuth 1.0a HMAC-SHA1. Search and trending return normalized metadata. The play action requests a fresh, short-lived stream URL; clients must call it immediately before playback and must not persist the URL. Audiomack developer approval and current terms must be confirmed before production use. The endpoint deliberately does not expose credentials to the browser.

## Boomplay

Endpoint: `GET /api/music/boomplay`

Boomplay has no open public developer programme. API access requires a direct agreement. Once Boomplay supplies its official API specification and credentials, implement the documented protocol in this adapter. Expected server-only credentials are `BOOMPLAY_CLIENT_ID` and `BOOMPLAY_CLIENT_SECRET`. No guessed API URLs or stream endpoints are called.

## ReverbNation

Endpoint: `GET /api/music/reverbnation`

ReverbNation currently describes its API as internal-use only. Obtain written access or an approved partner integration before implementing catalogue or playback calls. Expected credentials, if granted, are `REVERBNATION_CLIENT_ID` and `REVERBNATION_CLIENT_SECRET`. No guessed API URLs or stream endpoints are called.

## Response semantics

The Boomplay and ReverbNation endpoints return HTTP 503 with machine-readable access status and required next steps until official access is granted. This is intentional: a status endpoint is not represented as a working catalogue API. Audiomack returns HTTP 503 until developer credentials are configured.

## Security and playback

All credentials must be configured as server-side Vercel environment variables, never `VITE_*` variables. Short-lived playback URLs are fetched on demand. Provider attribution, rights, regional restrictions, ads, and commercial-use terms remain applicable. A returned stream URL is not by itself a grant of redistribution rights.
