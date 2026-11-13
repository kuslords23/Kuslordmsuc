# KUS Music → Shared Royal

KUS Music remains an independent product and owns its music player, track library, playback queue, studio UI and domain data. Its AI Mix Assistant is a specialist surface over the shared Royal intelligence; it is not a second model assistant.

## Configuration

Set in the Music Vercel project:

- `VITE_ROYAL_API_URL=https://kus-ai-app.vercel.app`
- Existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must point to the shared Kus-Lords Supabase project.

The KUS AI Vercel project must include the exact Music production origin in `ROYAL_COMPANION_ALLOWED_ORIGINS`.

## Request lifecycle

1. Music reads the signed-in user's current Supabase access token from its existing `kus-lords-auth` session.
2. The Studio AI Mix Assistant sends the prompt to `POST /api/royal/companion` with `companionId: "music"`.
3. KUS AI validates the token and resolves the server-owned Music profile.
4. Royal handles conversation; research/objective-shaped requests enter KUS Core through the existing canonical route.
5. Guardian continues to authorize consequential actions. A profile or UI does not grant permission.
6. The assistant renders the actual Royal response. Failed auth, missing configuration and provider errors are shown rather than replaced with a fabricated response.

## What remains local

- Music player and single authoritative audio element.
- Track catalogue, albums, playlists and playback queue.
- Studio beat pads and music-specific UI.
- Direct media-generation/TTS capabilities exposed by the KUS AI media gateway remain separate from the conversational assistant.

No service-role key, provider key or KUS AI server secret belongs in the Vite/browser environment.
