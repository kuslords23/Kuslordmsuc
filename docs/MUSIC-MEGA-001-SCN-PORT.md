# MUSIC-MEGA-001: SCN Music Extraction & Kus-Lords Port

Status: in progress  
Working branch: `music-mega-001-scn-port`  
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
