# Kus-Lords Music: automatic home discovery

The Music home calls `GET /api/music/discover` when opened. The server queries the configured Spotify, YouTube Data API and Apple Music catalogue APIs for Ghanaian, wider African and international discoveries. Responses are edge-cached for six hours and can be served stale for up to a day while the cache refreshes.

## Required production provider settings

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `YOUTUBE_DATA_API_KEY`

Apple Music is optional and requires:

- `APPLE_MUSIC_TEAM_ID`
- `APPLE_MUSIC_KEY_ID`
- `APPLE_MUSIC_PRIVATE_KEY`
- Optional `APPLE_MUSIC_STOREFRONT` (defaults to `gh`)

Keep every provider credential server-side. Do not prefix secrets with `VITE_`.

## Persistent discovered artist profiles

Provider artist records are kept separate from `artist_profiles`, which represents real KUS creator accounts and their ownership/verification state. The migration creates `music_discovered_artists` with public read-only access.

For the Vercel discovery API to upsert and read the persistent records, configure one server-only Supabase privileged key:

- `SUPABASE_SERVICE_ROLE_KEY` (legacy service-role key), or
- `SUPABASE_SECRET_KEY` (new secret key)

Also ensure `SUPABASE_URL` is configured server-side, or rely on the existing `VITE_SUPABASE_URL` project URL. Never expose the privileged key to the browser. Without the privileged key, the live discovery feed still assembles and displays provider-sourced artist profiles for that response, but those profiles are not stored in the database.

## Recommendation and playback behaviour

- KUS catalogue recommendations use local listening history and available track likes/genre metadata.
- External discovery ranking uses recent local listening signals as lightweight relevance hints; it is not a claim of a trained cross-user recommendation model.
- KUS tracks use the native KUS player.
- Spotify, Apple Music and YouTube items open through the official provider embed. No protected audio is scraped, downloaded or rehosted.
- Provider-sourced artist profiles are discovery cards/details, not verified KUS creator accounts.
- The home feed refreshes on entry and is cache-backed. This implementation does not run a separate scheduled crawler while nobody is using the app.
