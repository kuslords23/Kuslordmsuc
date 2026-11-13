# MUSIC-MEGA-001: SCN Music Extraction & Kus-Lords Port

Status: in progress  
Working branch: `main`  
Reference repository: `kuslords23/sport-clan-nexus-`  
Target repository: `kuslords23/Kuslordmsuc`  
Royal integration repository: `kuslords23/kus-ai-app`

## Objective

Port the complete SCN music domain into the standalone Kus-Lords Music application. This means porting user-visible capabilities and their required data, API, storage, and playback behaviour, not copying isolated page components. Preserve the existing standalone app and adapt framework-specific code rather than importing Next.js assumptions into Vite/React.

## Architecture boundaries

- **SCN** is the reference implementation for existing music-domain behaviour and the shared Supabase music data model.
- **Kus-Lords Music** is the standalone music application and owns the adapted music experience, player, creator workflows, and future production studio.
- **KUS AI / Royal** is the conversational and agentic control surface. It should call explicit, authenticated music-app capabilities rather than duplicate the music database or create a second playback system.
- Keep the existing shared Supabase project, `kus-music` audio bucket, and SCN-compatible records. Do not create parallel music tables or buckets without a demonstrated schema gap.

## Verified SCN inventory

The SCN repository contains these music surfaces and supporting modules:

- Pages: `app/music/page.tsx`, `app/music/discover/page.tsx`, `app/music/library/page.tsx`, `app/music/playlists/page.tsx`, `app/music/studio/page.tsx`, and `app/music/artist/[id]/page.tsx`.
- Components: `FeedMusicHub`, `MusicCreatorStudio`, `MusicUploadForm`, `MusicPlayer`, `FeedEmbedPlayer`, `MusicPickerModal`, `MusicPickerPanel`, `SoundDetailGrid`, `ArtistPlatformCatalog`, `MusicArtistPageClient`, and `MiniMusicPlayer`.
- Client/domain modules: `globalMusicPlayer`, `useGlobalMusic`, `musicSearch`, `musicEmbed`, `musicMonetization`, `musicReleaseRegistry`, `musicStreamTracking`, `musicPageStore`, `curatedMusicCatalog`, and `artistProfiles`.
- API routes: `/api/music/search`, `/api/music/curated`, `/api/music/artist-profiles`, `/api/music/platform-catalog`, `/api/music/release-check`, and `/api/analytics/track-stream`.
- Music schema migrations include `027_feed_video_music_enrich.sql`, `037_kus_music_audio_mimes.sql`, `038_feed_view_listen_counts.sql`, `040_music_architecture.sql`, and `043_artist_storefront.sql`. Additional feed/storage migrations are dependencies and must be reviewed before porting.
- Migration 040 defines artist profiles, artist-tier limits, release registry/content-hash uniqueness, and durable stream events. Migration 043 adds artist storefront fields.

## Verified standalone baseline

The standalone app is a Vite + React application using Supabase JS. It already has a home/browse/radio/library/search/studio shell, albums and playlists, upload modal, player bar, auth context, a local audio element, cloud-track loading, and a postMessage bridge for embedded playback control.

The current upload implementation and data mapper require a field-by-field compatibility review against SCN's `feed_posts` audio shape. The existing bridge is a useful foundation, but it is not yet a complete Royal capability contract.

## Safety correction applied in this batch

The original `package.json` ran `scripts/unzip-integrate.cjs` automatically through `predev`. That script recursively finds ZIP files and writes their contents into the source tree, including files with existing names. This can silently replace application code during ordinary development startup.

MUSIC-MEGA-001 removes the automatic `predev` hook. The historical ZIPs and manual `integrate` command are preserved for now. Do not run the manual integration command against unreviewed archives. A later hardening step will make archive application explicit, previewable, and collision-safe.

## Port rules

1. Build a dependency closure for every SCN music surface. Include imported shared components, hooks, utilities, types, API contracts, SQL objects, RLS policies, and storage assumptions.
2. Classify each capability as: implemented in SCN, implemented in standalone, missing, incompatible, or blocked by external credentials/provider setup.
3. Adapt Next.js server routes to standalone-compatible service/API boundaries. Never import Next.js server modules into the Vite client.
4. Keep all secrets server-side. Never expose Supabase service-role credentials or provider secrets in browser code.
5. Preserve authentication ownership. Never trust a client-supplied user ID as proof of identity; use the authenticated Supabase session or a trusted server endpoint.
6. Reuse the existing global audio element/player state. Do not create competing players for each view or for Royal.
7. Keep playback, likes, comments, follows, uploads, playlist changes, release registration, and monetization tied to real persisted records. No mock success.
8. Keep Guardian approval for consequential external actions such as paid distribution, purchases, payouts, or sending messages on the user's behalf.
9. Preserve existing standalone features unless a replacement is demonstrably equivalent and covered by regression checks.
10. Do not claim a feature is complete until its build, runtime path, auth/RLS behaviour, and persistence have been verified.

## Delivery sequence

- **001-A: Safe baseline and extraction map** (this document and startup safety correction).
- **001-B: Full SCN dependency and schema inventory**, including exact imports and API/RPC contracts.
- **001-C: Shared data and storage compatibility**, including audio uploads, artist identity, stream tracking, release checks, and storefront fields.
- **001-D: Standalone feature parity**, including discovery, artist pages, playlists/library, social actions, embeds, and a persistent global player.
- **001-E: Studio and creation expansion**, keeping DAW and AI provider work distinct from parity work.
- **001-F: Royal capability bridge**, with typed, authenticated operations and approval boundaries.
- **001-G: Build, regression, security, mobile, and deployment verification.

## Current known gaps to resolve

- Compare the standalone audio upload payload and feed query/mapping against SCN's canonical audio post fields.
- Verify whether the standalone app queries only audio posts and whether it handles missing optional storage fields safely.
- Map SCN APIs and SQL RPCs to the standalone's supported server-side integration. The standalone must not call SCN's Next.js API routes as an undocumented permanent dependency.
- Verify the actual Supabase bucket policies and RLS policies before changing schema or storage.
- Replace preview-only Royal music retrieval with a controlled capability contract for search, play, queue, playback state, playlist actions, and creator/social actions.
- Audit the four historical ZIP overlays before any are applied. No archive should be allowed to overwrite files silently.

## Acceptance criteria

- Ordinary `npm run dev` never extracts archives or mutates tracked source files.
- Existing standalone app functionality remains available.
- Every migrated feature has a documented source, target implementation, persistence path, and test/verification result.
- Music records remain compatible with the shared SCN Supabase schema.
- The player has one authoritative playback state and supports app UI plus approved parent/Royal controls.
- All user-owned mutations are authenticated and enforced by database policies or trusted server-side checks.
- Unavailable provider integrations are clearly reported as unavailable, not simulated as successful.


## 001-B: First compatibility findings

### Changes already applied on the working branch

- Removed the `predev` script from `package.json`. Normal Vite startup no longer runs the recursive ZIP extractor.
- Extended the standalone `Track` type with optional canonical record identifiers and metadata pointers: `postId`, `userId`, `artistProfileId`, and `audioContentHash`.
- Updated the Supabase adapter to read only `feed_posts.post_type = 'audio'` and accept either a public `media_url` or a `storage_path`. The previous query required both fields to be non-null, which excluded valid rows.
- Updated the standalone upload insert to mark records as `post_type: 'audio'` and persist SCN's `sound_title` and `sound_artist` metadata fields.
- Updated the mapper to prefer canonical sound title/artist fields and retain the feed post/user/artist/hash identifiers.

### Compatibility issues identified

| Area | Finding | Required treatment |
|---|---|---|
| Audio uploads | Previous standalone uploads omitted `post_type: 'audio'`, `sound_title`, and `sound_artist`. | Corrected in this branch; verify against live schema and RLS before release. |
| Library query | Previous query required both `media_url` and `storage_path`, despite the mapper supporting either. | Corrected to an audio-type filter plus an either/or URL-path condition. |
| Artist identity | Previous mapper hard-coded a generic artist name and discarded owner/artist-profile identifiers. | Basic fields now retained; artist profile lookup and storefront integration remain. |
| Playback | Standalone has one app-level audio element and a useful postMessage bridge. It does not yet expose the full SCN player contract or stream verification. | Preserve one player; add a typed, origin-checked control/state contract and durable stream event calls. |
| Likes | Standalone `PlayerBar` currently stores the like state in component-local state only. | Replace with persisted, authenticated social actions; no optimistic success without a confirmed write. |
| Monetization | SCN's `musicMonetization.ts` contains substantial localStorage-backed earnings, affiliate, referral, paid-sound-license, and boost state. | Treat these as prototype/UI logic, not authoritative money records. Audit durable ledger/payment support before exposing real balances, purchases, or payouts. |
| Artist API | SCN's artist-profile route can use a service-role client while accepting a client-supplied `userId`. | Do not copy this trust model. Use verified session identity and RLS or a server route that validates the bearer session before privileged writes. |
| Release registry | SCN has a release-registry RPC and RLS. The SECURITY DEFINER function accepts an owner ID argument; its caller/owner binding must be reviewed before exposing it to a browser client. | Preserve the unique content-hash/ISRC rule, but harden authorization at the database boundary. |
| Stream tracking | SCN uses verified-listen thresholds (30 seconds direct or full completion; 10 seconds video attribution), idempotency keys, and a durable RPC. | Port the thresholds and idempotency contract. Do not count a stream merely because playback started. |
| Historical archives | The standalone repository contains four historical overhaul ZIPs and the extractor can overwrite tracked files. | Keep archives as reference artifacts; do not run them wholesale. Build a reviewed manifest/patch workflow if any archive contents are needed. |

### Schema facts established from SCN migrations

- Migration 027 adds `sound_source_post_id`, `sound_title`, and `sound_artist` to `feed_posts`.
- Migration 040 adds `artist_profiles`, artist-tier enforcement, `artist_profile_id`, `audio_content_hash`, `isrc`, `music_release_registry`, `music_stream_events`, and verified stream RPCs.
- Migration 043 adds artist storefront fields including tagline, vision, genre focus, CTA, hero image, press kit, booking email, socials, and credits.
- Migration 037 covers audio MIME/storage support; migration 038 covers listen-count support. Their exact storage policies and dependencies still need to be mapped before any database migration is copied or modified.

### Verification still outstanding

No production build, live Supabase write, RLS test, storage upload, stream-count test, or mobile playback test has been run from this GitHub-only editing session. The code changes above are source-level corrections and must not be described as runtime-verified.


## 001-D / 001-F: First player, creator, and Royal integration slice

### Standalone player bridge

The standalone app now exposes an expanded parent-window bridge:

- Exact-origin allowlist from `VITE_ALLOWED_PARENT_ORIGINS`, plus the existing SCN origin.
- Parent-source check so unrelated windows cannot send control messages.
- Target-origin replies and state broadcasts; wildcard `postMessage` targets have been removed.
- Search/list tracks, play a selected track, set/add/clear queue, playback state, play/pause, next/previous, seek, and volume commands.
- The ready handshake advertises supported capabilities.
- Royal can control the existing audio player rather than creating a second audio stream.

This is a cross-origin UI control channel only. It is not a substitute for authentication, RLS, or Guardian approval.

### Creator upload identity

- Added an RLS-session-backed lookup for the signed-in user's own artist profiles.
- Added an artist-profile selector to the upload modal when profiles exist.
- Uploads now persist the selected `artist_profile_id` alongside the canonical audio post fields.
- The selected profile is optional so users without a profile can still upload under the existing account flow.

### Repeatable source checks

- Added `npm run verify:music`, which checks the startup safety rule, bridge command handlers, origin restrictions, canonical audio query/insert fields, and artist-profile upload wiring.
- This is a static source-contract check. It does not replace a Vite production build, browser test, or live Supabase/RLS verification.

### Royal integration

Royal's chat now includes a collapsible Kus-Lords Music panel with an embedded iframe, playback controls, track search, and click-to-play results. The companion registry marks Music active only when `NEXT_PUBLIC_MUSIC_COMPANION_URL` is configured; otherwise it does not silently route users to the Hub.

The Royal panel validates both iframe message origin and iframe window source. The music app independently validates its parent origin and source.

### Deployment requirements

- Set `NEXT_PUBLIC_MUSIC_COMPANION_URL` in the Kus AI deployment to the actual deployed standalone Music URL.
- Set `VITE_ALLOWED_PARENT_ORIGINS` in the Music deployment to the exact Kus AI and SCN production origins.
- Deploy both sides before expecting the embedded handshake to complete.
- Do not mark cross-origin playback verified until tested in the deployed browser environment.

### Remaining before feature parity

Artist profile display/storefront editing, artist discovery/catalog API parity, playlists persisted to shared storage, social interactions, verified stream events, and secure server-side release registration are still outstanding. Monetization UI must not be treated as a real payout or wallet system.


## 001-D: Artist storefront parity slice

The standalone app now includes a public artist directory backed by SCN's `artist_profiles` table and a storefront detail view.

Ported fields:
- Artist name, bio, avatar, verified flag, follower count.
- Tagline, vision, genre focus.
- Hero image, press kit URL, booking email.
- Social links and credits.
- Linked releases through `feed_posts.artist_profile_id`.

The directory uses the existing public-read RLS policy and only accepts HTTP(S) URLs for external links. It does not copy the SCN service-role artist API. The upload modal can select an artist profile owned by the signed-in user, and the upload adapter writes that profile ID to the audio post.

Limitations:
- Storefront data is read-only in this slice; artist editing/management is next.
- A profile only displays releases explicitly linked by `artist_profile_id`; it does not guess ownership from artist display names.
- If migration 043 is not applied in the shared Supabase project, the storefront query will report the schema issue and the directory will remain empty. No schema migration was applied from this session.

## Updated parity snapshot

| Capability | SCN reference | Standalone status |
|---|---|---|
| Audio upload and discovery | `feed_posts` audio records + `kus-music` / `kus-images` | Basic contract aligned; runtime verification pending |
| Creator-to-artist linking | `artist_profiles` + `artist_profile_id` | Upload selector + persisted link added |
| Public artist directory/storefront | `artist_profiles` + migration 043 fields | Read-only directory/detail view added |
| Global playback | SCN global music player | Standalone single player + origin-checked bridge commands |
| Search | Native + curated + external catalog APIs | Local loaded-library search via bridge; external catalog parity pending |
| Playlists | SCN client-side playlist state | Standalone custom playlist management still pending |
| Likes/comments/follows | Feed/social services | Not ported yet |
| Verified stream events | RPC + API + idempotency | SCN security hardening PR created; standalone integration pending |
| Monetization | UI + localStorage calculations in SCN | Not treated as a real financial ledger |
| Studio | SCN creator studio | Existing standalone beat pads/AI Mix Assistant/TTS retained; full DAW pending |
| AI music generation | Provider-dependent | Not yet connected; provider credentials and product/API terms required |
| Royal control | SCN app bridge / companion surfaces | Embedded Royal player panel and search/play/queue bridge added; deployment config pending |

The source verifier now also checks the artist-directory data adapter and storefront release linkage.


## 001-D: Playlist management parity slice

The standalone app now includes SCN-compatible local playlist management:
- Create up to 30 named playlists.
- Persist playlists under the same `kus_music_playlists` localStorage key used by SCN.
- Add tracks from the loaded music library.
- Play a playlist queue, remove tracks, and delete playlists.
- Keep the playlist UI in the existing Library tab without introducing a second playback engine.

This intentionally matches SCN's current localStorage-based playlist persistence. It is not cross-device cloud sync. The UI states that clearly rather than implying that a local playlist is backed up to Supabase.


## 001-D: Official external music embeds

The standalone search surface now recognizes Spotify URLs/URIs, Apple Music URLs, SoundCloud URLs, and supported bare platform IDs. It renders each platform's official embed player and an external open link. Audio remains hosted and played by the licensed platform; the app does not download or rehost third-party audio.

Text-based external catalog search is still pending because it needs a server-side provider integration and credentials. The current slice handles direct links/IDs only.


## 001-D: Music comments

The standalone player now opens a comments panel for published audio posts. It reads and writes the shared SCN `feed_comments` table, subscribes to new comments in realtime, and derives the comment author from the active Supabase session rather than trusting a caller-supplied user ID. The entry point is available from desktop player controls and the mobile mini-player.

The comment author RLS hardening is proposed separately in SCN PR #142 (`053_feed_comment_identity_hardening.sql`). Until that migration is applied, the standalone client still uses the verified session identity, but the database's existing insert policy remains weaker than desired. Replies, comment likes, video replies, and comment notifications are not yet ported.


## 001-F: Royal comment capability

The music app bridge now supports:
- `GET_COMMENTS`: read comments for the current or selected published audio post.
- `POST_COMMENT`: create a comment using the active Supabase session identity.

The bridge rejects comment publishing unless the caller supplies `confirmed: true`. Royal's embedded music panel exposes a Post button; clicking it is the user's explicit confirmation. The app derives the author ID from `session.user.id`, not from a message payload.

This is a comment capability, not a general messaging capability. Likes, follows, replies, and direct person-to-person messages still need their own real data contracts and approval flows. SCN PR #142 proposes database-level comment author RLS hardening; apply migration 053 before treating the comment write path as fully protected at the database boundary.


## 001-D: Artist follow state

The standalone artist storefront now supports Follow/Following. It uses the same `kus_followed_artists` localStorage key as SCN's current music hub. This preserves local-device behaviour only; it is not the shared cross-device `follows` graph and does not claim to notify artists.


## 001-F: Track likes

The player and Royal bridge now expose Like/Unlike for the currently selected track. This updates the app's in-memory track state and current session's displayed count. It is intentionally labelled as session-local: the SCN music hub's current `toggleLike` path also updates its in-memory track collection rather than writing a durable likes table. No shared database likes table was found in the inspected SCN migrations, so this port does not invent one or claim cross-device persistence.


## 001-D: Artist profile management

The artist directory now includes Create Artist Profile and owner-only Edit Profile workflows. The adapter obtains the active Supabase session itself, inserts with `session.user.id`, and scopes updates by both profile ID and authenticated owner ID. It exposes the SCN storefront fields for biography, tagline, vision, avatar, genre focus, hero image, press kit, booking email, CTA, and social links.

The existing SCN RLS policy and artist-tier trigger remain authoritative. Profile creation may be rejected by the existing tier limit or global unique artist-name constraint; the UI reports the database error rather than bypassing either rule.


### Royal natural-language control boundary

The embedded panel currently provides direct user-interface controls and a validated cross-origin command protocol. It is not yet connected to Royal's model tool-calling/action dispatcher. Therefore the bridge is ready for the next integration layer, but natural-language instructions such as "play this song", "like that track", or "comment on this release" are not yet guaranteed to execute from chat without the user operating the embedded panel. The next Royal integration slice must register typed music actions with KUS AI's execution boundary, return action receipts to the conversation, and require confirmation for public comments or other consequential actions.


## 001-G: Live-data parity and creator operations

This batch continues the SCN Music port directly on `main`.

### Ported and implemented with working UI

- **Live native catalogue:** the standalone app now starts with no bundled demo tracks or albums. The only native catalogue source is the shared `feed_posts` audio inventory.
- **Honest empty/error states:** an empty library or Supabase failure no longer substitutes sample songs. The UI reports loading, empty, or unavailable states.
- **Realtime updates:** audio post and artist-profile changes refresh the standalone catalogue and directory through Supabase Realtime subscriptions.
- **Discovery UI:** the search screen now includes live Spotify catalogue results from a server-side Vercel function and official Spotify embeds. Existing direct Spotify, Apple Music, and SoundCloud links continue to use official platform embeds.
- **Verified listening:** direct playback records a stream through SCN's `log_music_stream_event_v2` RPC after 30 seconds, or after completion of a shorter track. Session keys and the database uniqueness constraint prevent duplicate stream events.
- **Creator analytics UI:** Studio now includes a creator-performance view reading the signed-in user's actual audio posts and `music_stream_events`. It refreshes on database changes and reports releases, verified streams, and listened minutes.
- **Release registration:** uploads are SHA-256 fingerprinted, checked against `music_release_registry` and `feed_posts.audio_content_hash`, then registered under the authenticated owner. If registration fails after upload, the app attempts to remove the just-created post and storage objects.
- **Artist / playlist / comment surfaces:** the previously ported artist directory/storefront editor, playlist manager, shared comments panel, upload flow, and global player remain in place.
- **Removed unsupported UI/data:** removed seeded tracks/albums, fallback tracks, ZIP-extracted track loading, fake radio stations, Sports UI/data, mock stadium labels, and local-only like counters. The desktop player no longer displays a like control that is not backed by a durable SCN likes table.

### Deliberately not presented as real functionality

- SCN's current playlist and followed-artist state uses localStorage. The standalone port preserves that same device-local behaviour; it does not claim cloud sync or cross-device realtime persistence.
- SCN's current track-like path is in-memory only and no durable likes table was found in the inspected migrations. The standalone app therefore omits likes rather than displaying invented engagement.
- SCN's earnings, affiliate, referral, boost, and paid-sound UI uses localStorage calculations. Those prototypes are not copied as real wallets, purchases, payouts, or financial analytics.
- Full text search across Spotify requires server-only `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` on the Kus-Lords Music Vercel project. Without those credentials, the UI reports that the external catalogue is not configured. Direct official embeds remain available.
- Apple Music and SoundCloud direct links/embeds are supported; their text-search catalogue providers are not implemented in this batch.
- A full DAW (multitrack timeline, piano roll, mixer, effects, project save/export) is a separate Kus-Lords Music product extension, not an SCN Music screen that can simply be ported. The existing beat-pad / Royal / voice studio remains.
- Natural-language execution of every music action from Royal is still not complete. The existing bridge supports player, queue, search, and confirmed comment actions; more typed actions need to be registered in Royal's execution dispatcher.

### Database prerequisites and security

- The shared Supabase project must have SCN migrations 040 and 043 applied, plus the earlier audio/storage dependencies documented above.
- The upload flow intentionally fails before uploading if the release-registry schema is unavailable. It does not silently bypass duplicate-release protection.
- Release registration uses a direct RLS-protected insert with the authenticated owner ID. It does not call the existing public SECURITY DEFINER release RPC with a client-supplied owner ID.
- Realtime requires `feed_posts`, `artist_profiles`, and `music_stream_events` to be included in the Supabase Realtime publication.
- No schema migration was applied by this source-code batch. Database migration status and RLS / Realtime publication must be verified separately.

### Verification boundary

GitHub source commits and Vercel production builds are separate facts. The Vercel build triggered from `main` must pass the Royal and Music source verifiers plus the Vite production build. Live Supabase upload, release-registry, stream-count, RLS, Spotify search, and mobile playback tests remain necessary before claiming end-to-end parity.


## 001-H: Cloud-only user library and live social state

The initial compatibility slice mirrored SCN's localStorage playlist and followed-artist keys. That was superseded to satisfy the standalone product requirement that user music data be real, account-backed, and synchronized.

- Playlists now use `music_playlists` and `music_playlist_tracks`, with owner-scoped RLS.
- Artist follows now use `artist_follows`, keyed by authenticated user and artist profile.
- Artist follower counts are maintained by a database trigger from actual follow/unfollow rows.
- Playlist and follow state load from Supabase and refresh through Realtime subscriptions.
- Playlist actions require a signed-in user. Only published audio posts with canonical UUID IDs can be added.
- Device-local playlist and artist-follow storage has been removed. Existing local-only lists are not silently presented as cloud-synced records.
- The app does not create synthetic playlists, sample follows, demo radio stations, or fabricated track engagement.

The shared Supabase migration for these tables, policies, trigger, and Realtime publication has been applied to the active `Kus-lords-prod` project. The source verifier now fails if localStorage is reintroduced for music playlists or artist follows.


## 001-I: Authenticated ElevenLabs voice generation

- The Studio voice panel now calls a real Vercel serverless endpoint at `/api/studio/elevenlabs`.
- The endpoint verifies the caller's Supabase access token before using provider credits.
- ElevenLabs credentials remain server-side. The browser never receives the API key.
- Supported voice IDs are allowlisted; text input is capped at 2,500 characters.
- Generated MP3 output is returned to the app with an audio player and playback controls.
- Production activation requires the `ELEVENLABS_API_KEY` environment variable on the Kus-Lords Music Vercel project. It is not currently configured, so the UI reports that the provider is disconnected rather than showing a fake successful generation.


## 001-J: Persistent track likes

- Reintroduced the SCN track-like control in the single global player, backed by the new `music_track_likes` table.
- Likes are unique per authenticated user and published audio post. RLS permits users to read their own like state and create/remove only their own likes.
- A database trigger maintains the canonical `feed_posts.likes` aggregate. The app only changes its displayed state after the database confirms the action.
- The catalogue reads aggregate counts from `feed_posts` and the current user's own like rows from `music_track_likes`.
- The old in-memory/session-only like behaviour has been replaced; playlist rows do not add a second like UI.


## 001-K: SCN global player transport parity

The single standalone global player now includes SCN's shuffle, repeat-current-track, and mute controls alongside the existing play/pause, previous/next, seek, volume, and comments controls. Shuffle changes the actual next-track selection; repeat restarts the current track; mute controls the shared audio element. No second player or duplicate playback engine was introduced.


## 001-L: Unified platform foundation and first Studio workspace

Applied to the shared Kus-lords-prod Supabase project on 2026-11-13.

- Added a KUS-owned canonical catalogue identity table and provider-source references. The schema separates one KUS recording identity from provider-specific track IDs, source URLs, official embed/SDK mode, availability, attribution, and metadata-retention policy.
- Provider catalogue rows are readable by the app, but browser clients cannot create or mutate them. Ingestion must use a trusted server-side workflow and respect each provider's metadata caching rules.
- Added owner-scoped cloud Studio projects with RLS, project JSON, BPM and a database-maintained updated timestamp.
- Added trend-follow preferences, service-controlled trend signals, auto-playlist definitions and ordered auto-playlist tracks.
- Extended user playlists with private/public/unlisted visibility, artwork and collaboration flags; added collaborator and playlist-save records. Existing playlist UI still needs to expose and exercise these new controls.
- The first mobile-first Studio workspace now has touch drum pads, a 16-step drum sequencer, a synth piano-roll grid, a basic Web Audio drum/synth sound engine, BPM control, cloud project save/reopen, autosave after the first save, and JSON project export.
- The current Studio is a functional sketchpad, not a professional DAW. It does not yet provide multitrack audio recording, imported sample persistence, full clip editing, mixer buses, effect chains, or rendered WAV/MP3 export.
- A persistent Royal companion panel is mounted throughout the Music app and calls the existing shared Royal companion endpoint with current section/track context. The UI does not create a second model. Natural-language music actions still require typed tools registered in the KUS AI execution dispatcher and Guardian-approved action receipts.

## 001-M: Multi-provider search groundwork

- The server-side music search endpoint now queries Spotify, YouTube Music-category videos, and the Apple Music catalog in parallel when their server credentials are configured.
- YouTube results are restricted to embeddable, syndicated videos and use the official YouTube iframe player. Spotify results use Spotify's official embed. Apple Music results use a server-signed developer token and Apple's official embed host.
- Search credentials remain server-side: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, YOUTUBE_DATA_API_KEY, APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY. None should be exposed through VITE_ variables.
- Search results are currently provider results for immediate discovery/preview. They are not yet ingested into the permanent KUS catalogue because provider-specific metadata retention, artwork, commercial and playback permissions must be implemented per provider contract before persistence.
- Apple Music catalog search is implemented, but MusicKit user authorization and subscription-aware full playback remain outstanding. SoundCloud text-search, provider availability refresh, cross-provider recording matching, and a provider-neutral playback controller remain outstanding.
- An official embed may count activity on its source platform only according to that platform's own policies. KUS must never promise that every embedded playback is an eligible official stream.

## Verification and deployment status after 001-L / 001-M

- Supabase migration kus_music_unified_platform_foundation and follow-up migration kus_music_studio_project_updated_at were applied successfully. The new tables and RLS policies were queried after application.
- Source changes are committed to main. Vercel production deployment is currently blocked by the account's api-deployments-free-per-day limit (HTTP 402, more than 100 deployments in the rolling daily allowance). The latest attempted production builds also stopped at the Royal prebuild verifier before the app bundle; the verifier contract has since been corrected.
- Do not treat these changes as live on the production domain until a new production build succeeds and the deployment is checked.


## 001-N: Follow Trends and catalogue-first lookup

- Added a Follow Trends panel to Explore. Signed-in users can follow genres, artists, countries and moods; preferences are stored in music_trend_follows under owner-only RLS.
- The panel reads active Royal-curated playlist definitions from music_auto_playlists and clearly shows an empty state until a curator publishes results. It does not fabricate trending songs.
- The music search API now checks the public KUS catalogue first and only calls external provider search when the KUS catalogue has no matching playable source records.
- Playlist owners can now switch their cloud playlists between private and public visibility. The database includes collaboration and playlist-save tables, but invitations, acceptance, following, sharing routes and collaborative editing UI remain to be built.
- Trend collection, signal scoring, scheduled refresh workers and playlist track generation remain inactive until their KUS Core/cron workflows are connected.


## 001-O: Playlist controls and listening history

- Split Playlists into its own main navigation destination. Library now remains a separate destination for releases and recently added music.
- Added Search, Explore, Playlists, Library and Studio to mobile navigation; added Search, Explore, Playlists and Library to the desktop sidebar while retaining Radio and Artist Directory.
- Playlist owners can set a playlist to private or public and reorder tracks with up/down controls.
- Added owner-scoped playlist play-history records. Starting a track from a playlist records the playlist and native track reference; this is KUS listening history, not a claim about provider stream counts.
- The database now also has music_playlist_catalog_entries, which binds a canonical KUS track and an available provider source to a playlist with owner/editor RLS and source-match validation. The UI still needs catalogue ingestion and controls to add/play those external entries. Collaborative invitation/acceptance, public playlist discovery and follow/save controls still need their UI and safe invite-accept workflow.


## 001-P: Cross-provider playlist storage and CI verification

- Added music_playlist_catalog_entries so a playlist can eventually contain KUS catalogue tracks backed by one specific authorized provider source, without requiring a feed_posts audio upload.
- Added a database trigger that rejects unavailable provider sources or a source/track identity mismatch.
- Added separate owner/editor insert, update and delete policies. Public playlist readers can read entries only through the playlist visibility policy.
- Applied Supabase migrations kus_music_cross_provider_playlist_entries and kus_music_cross_provider_playlist_entry_policy_fix.
- Added GitHub Actions verification on main: Royal contract checks, Music static checks, TypeScript typecheck and Vite production build.
- GitHub Actions run 43495949459 completed successfully on commit 0dca0302d4caf1d1f2f24cb402cef9b4b297381d. This verifies the repository build and TypeScript checks, not the live provider credentials or production runtime.
