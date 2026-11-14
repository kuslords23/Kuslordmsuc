-- Cover foreign keys and the rolling 24-hour stream eligibility lookup.
create index if not exists music_royalty_ledger_track_post_idx
  on public.music_royalty_ledger (track_post_id);
create index if not exists music_royalty_ledger_rate_version_idx
  on public.music_royalty_ledger (rate_version_id);
create index if not exists music_royalty_ledger_related_entry_idx
  on public.music_royalty_ledger (related_entry_id);
create index if not exists music_royalty_rate_versions_created_by_idx
  on public.music_royalty_rate_versions (created_by);
create index if not exists music_paid_sound_orders_track_post_idx
  on public.music_paid_sound_orders (track_post_id);
create index if not exists music_creator_payout_requests_destination_idx
  on public.music_creator_payout_requests (destination_id);
create index if not exists music_playback_sessions_track_idx
  on public.music_playback_sessions (track_post_id);
create index if not exists music_stream_events_viewer_track_created_idx
  on public.music_stream_events (viewer_user_id, track_post_id, created_at desc);
