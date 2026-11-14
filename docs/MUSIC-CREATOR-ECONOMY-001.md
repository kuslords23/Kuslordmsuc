# MUSIC-CREATOR-ECONOMY-001

## Scope delivered in this branch

### SCN-compatible publishing
- Artist profile selection and creation using the shared `artist_profiles` table.
- Release title, artist, album/collection, genre, mood, production credits, optional lyrics, audio and cover artwork.
- SHA-256 duplicate checks against the shared release registry before upload.
- Storage uploads use `{auth.uid()}/{random-id}.{extension}`, matching the live `kus-music` and `kus-images` Storage RLS policies.
- Audio post metadata is written to the shared `feed_posts` record and then registered in `music_release_registry`.
- If release registration fails, the newly inserted post and uploaded objects are rolled back.
- UI shows publishing stages without pretending to have byte-level upload progress.

### Creator ledger foundation
- `music_royalty_rate_versions` stores immutable, effective-dated GHS rate versions. No rate is seeded.
- `music_royalty_ledger` is append-only and idempotent. Stream credits, confirmed paid-sound sales, confirmed payouts, refunds and adjustments use unique idempotency keys.
- Only a direct stream event linked to a completed server-timed playback session can create a stream royalty entry. The session uses server-clock heartbeats, requires at least 30 accumulated seconds, expires on long heartbeat gaps, excludes creator self-streams, and applies a one-per-viewer/per-track rolling 24-hour cap.
- The older SCN stream RPC remains available for SCN listening counts, but its client-asserted duration does not qualify for Kus-Lords royalty accrual. Shorter-than-30-second tracks are not royalty-eligible in this first secure pass.
- The standalone Kus-Lords player now uses the new server-timed session RPCs for royalty-eligible events. This is a basic anti-abuse gate, not full bot/fraud detection.
- Paid-sound order validation checks the published listing, owner and exact stored price.
- Payout request validation checks a verified creator-owned destination and available ledger balance, including pending payout reservations.
- Ledger and rate rows cannot be edited or deleted. Corrections require compensating entries.
- Creator analytics reads a database-side aggregate over the complete ledger and confirmed sales/payout records. It does not sum a capped client-side page or estimate earnings.

## Not live yet

- No MTN MoMo, Hubtel, Paystack or other merchant account has been confirmed for Kus-Lords.
- No checkout session, signed provider webhook, disbursement adapter, KYC flow or license delivery endpoint is activated in this branch.
- A paid-sound price is saved as a listing preference only. It does not charge anyone or grant a license.
- Royalty eligibility is an explicit creator opt-in and is off by default. No earnings accrue until an authorized rate version is published.
- Artist subscription-tier upload limits are not guessed. The standalone app's authoritative subscription entitlement source must be identified first.

## Production rollout order

1. CI/typecheck/build passes and migration review.
2. Apply the additive database migration.
3. Test owner-folder uploads, artist ownership, duplicate rejection and rollback using a test account.
4. Test one qualifying verified stream with no rate (must create no ledger row).
5. Insert a temporary test rate in a controlled test environment, then test one verified qualifying stream (must create exactly one ledger row).
6. Verify RLS: one creator cannot read another creator's ledger, sales or payout requests.
7. Confirm merchant account, provider product, credentials, webhook signing method, collection and disbursement availability.
8. Implement and test checkout/webhook/license issuance and payout/disbursement reconciliation in sandbox before production.

## Known operational note

The shared Supabase Storage policies require the first object path segment to equal the authenticated user's UUID. The previous standalone uploader used a root-level object path, which did not satisfy those live policies. The new pipeline fixes that mismatch.


## Live database rollout status (2026-11-14)

- The additive creator-economy foundation migration has been applied to the shared Supabase project.
- A follow-up index migration has also been applied for creator ledger foreign keys, payout destinations, paid-sound tracks, playback sessions, and the rolling 24-hour stream lookup.
- Verified the seven new finance/playback tables, four client-facing RPCs, and the expected database triggers exist.
- RLS is enabled on every new table. Client inserts are denied for the ledger, paid-sound orders and payout requests. Private payment destinations, webhook receipts and playback-session tokens have no client policies or grants.
- Supabase advisor review found no new unindexed foreign keys among the new creator-economy tables after the index migration. Remaining INFO/WARN findings are existing shared-project items or expected unused indexes on the new, currently empty tables.
- Current live counts: **0 royalty rate versions, 0 creator-ledger entries, 0 paid-sound orders, 0 payout requests**. No money has been credited, charged or paid out.
- No royalty rate has been configured. Royalty accrual is therefore intentionally zero until the platform's rate and commercial terms are approved.
- The paid-sound listing preferences are stored, but no checkout, license delivery, or payout endpoint is enabled until the merchant/provider account is confirmed.
