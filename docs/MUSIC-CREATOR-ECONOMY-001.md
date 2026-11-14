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
- Only a newly inserted verified direct stream event can create a stream royalty entry, and only if the track owner opted in and an effective rate exists.
- The existing SCN stream RPC remains the authority for the 30-second / short-track-completion eligibility and unique session event.
- Paid-sound order validation checks the published listing, owner and exact stored price.
- Payout request validation checks a verified creator-owned destination and available ledger balance, including pending payout reservations.
- Ledger and rate rows cannot be edited or deleted. Corrections require compensating entries.
- Creator analytics reads a database-side aggregate over the complete ledger and confirmed sales/payout records. It does not sum a capped client-side page or estimate earnings.

## Not live yet

- No MTN MoMo, Hubtel, Paystack or other merchant account has been confirmed for Kus-Lords.
- No checkout session, signed provider webhook, disbursement adapter, KYC flow or license delivery endpoint is activated in this branch.
- A paid-sound price is saved as a listing preference only. It does not charge anyone or grant a license.
- Royalty eligibility can be opted into, but no earnings accrue until an authorized rate version is published.
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
