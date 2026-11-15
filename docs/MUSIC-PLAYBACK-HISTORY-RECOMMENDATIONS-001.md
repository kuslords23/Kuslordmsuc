# MUSIC-PLAYBACK-HISTORY-RECOMMENDATIONS-001

## Scope
- Keep KUS-uploaded audio on the existing native HTML audio path for full-file playback.
- Present external catalogue results as official provider players, not as KUS-hosted streams or guaranteed full-playback files.
- Add Spotify playlist and Apple Music playlist search results alongside existing track, artist and album discovery.
- Add a device-persistent recent listening/opened list (latest 50 entries) for KUS tracks and external provider items.
- Allow a history item to reopen its KUS track or official provider player.

## Playback truth and provider boundaries
- Spotify and Apple Music search credentials are catalogue/developer credentials, not a user's playback authorization.
- Full external playback remains governed by each provider's official embedded player, user login/subscription, region and content availability.
- YouTube continues through its official embeddable video player.
- External audio is not copied into KUS storage and provider playback is not represented as a KUS-owned stream.
- KUS-uploaded tracks continue to play from their stored audio URL through the native player.
- This batch does not implement Spotify OAuth/Web Playback SDK or Apple MusicKit user authorization. Those require separate provider app configuration and user-consent flows.

## History behavior
- KUS tracks are recorded when the KUS native player is asked to play them.
- External catalogue items are recorded when the user opens their official provider player. The provider's own play button starts playback; this app-level history cannot verify provider playback completion yet.
- History is stored in browser localStorage on the current device, capped at 50 unique recent items. It is not cross-device account sync.
- Reopening an external history item returns to the same official provider player. Reopening a KUS item uses the current catalogue record when available, with the saved item as fallback.

## Recommendations
- Spotify and Apple Music playlist results are now included in provider catalogue search.
- The UI separates playlist matches into a related-playlists section.
- Results remain provider-owned playlists and open in the official provider embed; no playlist content is copied into KUS.

## Verification gates
- Run `npm run typecheck`, `npm run verify:music`, and `npm run build`.
- Confirm configured Spotify and Apple Music credentials return playlist results.
- Test full playback with eligible accounts and verify fallback behavior for signed-out, ineligible, unavailable and region-restricted provider content.
- Validate history persistence after refresh and history replay for native and external items.
