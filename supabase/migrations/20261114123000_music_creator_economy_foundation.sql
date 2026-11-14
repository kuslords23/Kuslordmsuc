-- Creator publishing metadata and production-safe creator economy foundation.
-- No payment provider credentials are configured by this migration.

alter table public.feed_posts
  add column if not exists album_title text,
  add column if not exists genre text,
  add column if not exists mood text,
  add column if not exists production_credits text,
  add column if not exists lyrics text,
  add column if not exists monetization_enabled boolean not null default false,
  add column if not exists is_paid_sound boolean not null default false,
  add column if not exists paid_sound_price_ghs numeric(12,2),
  add column if not exists paid_sound_description text;

do $block$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.feed_posts'::regclass and conname = 'feed_posts_paid_sound_price_positive') then
    alter table public.feed_posts add constraint feed_posts_paid_sound_price_positive
      check (paid_sound_price_ghs is null or paid_sound_price_ghs > 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.feed_posts'::regclass and conname = 'feed_posts_paid_sound_requires_price') then
    alter table public.feed_posts add constraint feed_posts_paid_sound_requires_price
      check (not is_paid_sound or paid_sound_price_ghs is not null);
  end if;
end;
$block$;

create table if not exists public.music_royalty_rate_versions (
  id uuid primary key default gen_random_uuid(),
  currency text not null default 'GHS' check (currency = 'GHS'),
  amount_per_verified_stream_ghs numeric(18,6) not null check (amount_per_verified_stream_ghs > 0),
  direct_stream_threshold_seconds integer not null default 30 check (direct_stream_threshold_seconds = 30),
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from)
);
create index if not exists music_royalty_rate_versions_effective_idx
  on public.music_royalty_rate_versions (effective_from desc);

create table if not exists public.music_royalty_ledger (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null check (entry_type in ('stream_royalty','paid_sound_sale','payout','refund','adjustment')),
  stream_event_id uuid unique references public.music_stream_events(id) on delete restrict,
  track_post_id uuid references public.feed_posts(id) on delete restrict,
  rate_version_id uuid references public.music_royalty_rate_versions(id) on delete restrict,
  source_reference_id uuid,
  related_entry_id uuid references public.music_royalty_ledger(id) on delete restrict,
  idempotency_key text not null unique,
  amount_ghs numeric(18,6) not null check (amount_ghs <> 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  adjustment_note text,
  created_at timestamptz not null default now(),
  check (entry_type <> 'stream_royalty' or (stream_event_id is not null and rate_version_id is not null and amount_ghs > 0)),
  check (entry_type not in ('payout','refund') or amount_ghs < 0),
  check (entry_type not in ('stream_royalty','paid_sound_sale') or amount_ghs > 0)
);
create index if not exists music_royalty_ledger_creator_created_idx
  on public.music_royalty_ledger (creator_user_id, created_at desc);

create table if not exists public.music_creator_payment_destinations (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_recipient_ref text not null,
  account_name text,
  account_last4 text,
  status text not null default 'pending' check (status in ('pending','verified','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_user_id, provider, provider_recipient_ref)
);

create table if not exists public.music_paid_sound_orders (
  id uuid primary key default gen_random_uuid(),
  track_post_id uuid not null references public.feed_posts(id) on delete restrict,
  buyer_user_id uuid not null references auth.users(id) on delete restrict,
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  amount_ghs numeric(12,2) not null check (amount_ghs > 0),
  platform_fee_ghs numeric(12,2) not null default 0 check (platform_fee_ghs >= 0),
  creator_net_ghs numeric(12,2) not null check (creator_net_ghs > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','disputed')),
  provider text,
  provider_checkout_ref text,
  provider_payment_ref text,
  idempotency_key text not null,
  license_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_user_id, idempotency_key),
  check (buyer_user_id <> creator_user_id),
  check (platform_fee_ghs + creator_net_ghs = amount_ghs)
);
create index if not exists music_paid_sound_orders_creator_idx
  on public.music_paid_sound_orders (creator_user_id, created_at desc);
create index if not exists music_paid_sound_orders_buyer_idx
  on public.music_paid_sound_orders (buyer_user_id, created_at desc);

create table if not exists public.music_creator_payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  destination_id uuid not null references public.music_creator_payment_destinations(id) on delete restrict,
  amount_ghs numeric(12,2) not null check (amount_ghs > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'requested' check (status in ('requested','reviewing','processing','paid','failed','cancelled','reversed')),
  idempotency_key text not null,
  provider_payout_ref text,
  failure_code text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (creator_user_id, idempotency_key)
);
create index if not exists music_creator_payout_requests_creator_idx
  on public.music_creator_payout_requests (creator_user_id, requested_at desc);

create table if not exists public.music_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payload_sha256 text not null,
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table if not exists public.music_playback_sessions (
  id uuid primary key default gen_random_uuid(),
  track_post_id uuid not null references public.feed_posts(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  accumulated_seconds numeric(12,3) not null default 0 check (accumulated_seconds >= 0),
  status text not null default 'active' check (status in ('active','completed','expired')),
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists music_playback_sessions_owner_track_idx
  on public.music_playback_sessions (viewer_user_id, track_post_id, started_at desc);

create or replace function public.validate_music_paid_sound_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_owner uuid;
  v_is_paid_sound boolean;
  v_price numeric(12,2);
begin
  select f.user_id::uuid, coalesce(f.is_paid_sound, false), f.paid_sound_price_ghs
    into v_owner, v_is_paid_sound, v_price
  from public.feed_posts f
  where f.id = new.track_post_id and f.post_type = 'audio';

  if v_owner is null or v_owner <> new.creator_user_id then
    raise exception 'Paid-sound creator does not own this audio release.';
  end if;
  if not v_is_paid_sound or v_price is null then
    raise exception 'This audio release is not listed for paid licensing.';
  end if;
  if new.amount_ghs <> v_price then
    raise exception 'Paid-sound order amount does not match the published price.';
  end if;
  if new.platform_fee_ghs + new.creator_net_ghs <> new.amount_ghs then
    raise exception 'Paid-sound platform fee and creator net must reconcile to the gross price.';
  end if;
  if new.buyer_user_id = new.creator_user_id then
    raise exception 'Creators cannot purchase their own paid sounds.';
  end if;
  return new;
end;
$fn$;

create or replace function public.validate_music_creator_payout_request()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_destination_owner uuid;
  v_destination_status text;
  v_available numeric(18,6);
begin
  -- Serialize requests for this creator so concurrent withdrawals cannot overdraw.
  perform 1 from auth.users where id = new.creator_user_id for update;

  select creator_user_id, status
    into v_destination_owner, v_destination_status
  from public.music_creator_payment_destinations
  where id = new.destination_id;

  if v_destination_owner is null or v_destination_owner <> new.creator_user_id or v_destination_status <> 'verified' then
    raise exception 'Select a verified payout destination owned by this creator.';
  end if;

  select coalesce(sum(amount_ghs), 0)
    into v_available
  from public.music_royalty_ledger
  where creator_user_id = new.creator_user_id;

  select v_available - coalesce(sum(amount_ghs), 0)
    into v_available
  from public.music_creator_payout_requests
  where creator_user_id = new.creator_user_id
    and status in ('requested','reviewing','processing');

  if new.amount_ghs > v_available then
    raise exception 'Payout amount exceeds the available creator ledger balance.';
  end if;
  return new;
end;
$fn$;

create or replace function public.start_music_playback_session(p_track_post_id uuid)
returns table (session_id uuid, session_token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid := gen_random_uuid();
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.feed_posts where id = p_track_post_id and post_type = 'audio') then
    raise exception 'Audio release not found';
  end if;

  update public.music_playback_sessions
  set status = 'expired'
  where viewer_user_id = v_uid and track_post_id = p_track_post_id and status = 'active';

  insert into public.music_playback_sessions (
    id, track_post_id, viewer_user_id, token_hash
  ) values (
    v_session_id, p_track_post_id, v_uid, encode(digest(v_token, 'sha256'), 'hex')
  );
  return query select v_session_id, v_token;
end;
$fn$;

create or replace function public.heartbeat_music_playback_session(p_session_id uuid, p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_session public.music_playback_sessions%rowtype;
  v_now timestamptz := clock_timestamp();
  v_delta numeric(12,3);
begin
  if v_uid is null then return false; end if;
  select * into v_session
  from public.music_playback_sessions
  where id = p_session_id and viewer_user_id = v_uid
  for update;
  if not found or v_session.status <> 'active' then return false; end if;
  if v_session.token_hash <> encode(digest(coalesce(p_session_token, ''), 'sha256'), 'hex') then return false; end if;

  v_delta := extract(epoch from (v_now - v_session.last_heartbeat_at));
  if v_delta < 2 then return false; end if;
  if v_delta > 20 then
    update public.music_playback_sessions set status = 'expired' where id = p_session_id;
    return false;
  end if;

  update public.music_playback_sessions
  set accumulated_seconds = accumulated_seconds + least(v_delta, 15),
      last_heartbeat_at = v_now
  where id = p_session_id;
  return true;
end;
$fn$;

create or replace function public.complete_music_playback_session(p_session_id uuid, p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
  v_session public.music_playback_sessions%rowtype;
  v_now timestamptz := clock_timestamp();
  v_delta numeric(12,3);
  v_total numeric(12,3);
  v_inserted integer := 0;
begin
  if v_uid is null then return false; end if;
  select * into v_session
  from public.music_playback_sessions
  where id = p_session_id and viewer_user_id = v_uid
  for update;
  if not found or v_session.status <> 'active' then return false; end if;
  if v_session.token_hash <> encode(digest(coalesce(p_session_token, ''), 'sha256'), 'hex') then return false; end if;

  v_delta := extract(epoch from (v_now - v_session.last_heartbeat_at));
  if v_delta > 20 then
    update public.music_playback_sessions set status = 'expired' where id = p_session_id;
    return false;
  end if;
  v_total := v_session.accumulated_seconds + case when v_delta >= 2 then least(v_delta, 15) else 0 end;
  if v_total < 30 then
    update public.music_playback_sessions
    set status = 'expired', accumulated_seconds = v_total, last_heartbeat_at = v_now
    where id = p_session_id;
    return false;
  end if;

  update public.music_playback_sessions
  set status = 'completed', accumulated_seconds = v_total,
      last_heartbeat_at = v_now, completed_at = v_now
  where id = p_session_id;

  -- One qualifying event per viewer and track in any rolling 24-hour window.
  if exists (
    select 1 from public.music_stream_events e
    where e.track_post_id = v_session.track_post_id
      and e.viewer_user_id = v_uid
      and e.created_at > v_now - interval '24 hours'
  ) then
    return false;
  end if;

  insert into public.music_stream_events (
    track_post_id, viewer_user_id, session_key, source, listened_seconds
  ) values (
    v_session.track_post_id, v_uid, v_session.id::text, 'direct', v_total
  ) on conflict (track_post_id, session_key, source) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.feed_posts
    set listen_count = coalesce(listen_count, 0) + 1
    where id = v_session.track_post_id;
  end if;
  return v_inserted > 0;
end;
$fn$;

create or replace function public.accrue_music_stream_royalty()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_creator_id uuid;
  v_monetization_enabled boolean;
  v_rate public.music_royalty_rate_versions%rowtype;
begin
  if new.source <> 'direct' or new.viewer_user_id is null then return new; end if;

  select f.user_id::uuid, coalesce(f.monetization_enabled, false)
    into v_creator_id, v_monetization_enabled
  from public.feed_posts f
  where f.id = new.track_post_id and f.post_type = 'audio';

  if v_creator_id is null or not v_monetization_enabled or new.viewer_user_id = v_creator_id then return new; end if;
  if not exists (
    select 1 from public.music_playback_sessions s
    where s.id::text = new.session_key
      and s.track_post_id = new.track_post_id
      and s.viewer_user_id = new.viewer_user_id
      and s.status = 'completed'
      and s.accumulated_seconds >= 30
  ) then return new; end if;

  select * into v_rate
  from public.music_royalty_rate_versions r
  where r.effective_from <= new.created_at
    and (r.effective_until is null or r.effective_until > new.created_at)
  order by r.effective_from desc
  limit 1;
  if not found then return new; end if;

  insert into public.music_royalty_ledger (
    creator_user_id, entry_type, stream_event_id, track_post_id,
    rate_version_id, idempotency_key, amount_ghs, currency
  ) values (
    v_creator_id, 'stream_royalty', new.id, new.track_post_id,
    v_rate.id, 'stream:' || new.id::text, v_rate.amount_per_verified_stream_ghs, v_rate.currency
  ) on conflict (idempotency_key) do nothing;
  return new;
end;
$fn$;

create or replace function public.record_music_paid_sound_ledger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.music_royalty_ledger (
      creator_user_id, entry_type, track_post_id, source_reference_id,
      idempotency_key, amount_ghs, currency
    ) values (
      new.creator_user_id, 'paid_sound_sale', new.track_post_id, new.id,
      'paid-sound:' || new.id::text, new.creator_net_ghs, new.currency
    ) on conflict (idempotency_key) do nothing;
  elsif new.status = 'refunded' and old.status = 'paid' then
    insert into public.music_royalty_ledger (
      creator_user_id, entry_type, track_post_id, source_reference_id,
      idempotency_key, amount_ghs, currency, adjustment_note
    ) values (
      new.creator_user_id, 'refund', new.track_post_id, new.id,
      'paid-sound-refund:' || new.id::text, -new.creator_net_ghs, new.currency, 'Verified paid-sound refund'
    ) on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$fn$;

create or replace function public.record_music_payout_ledger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    insert into public.music_royalty_ledger (
      creator_user_id, entry_type, source_reference_id,
      idempotency_key, amount_ghs, currency
    ) values (
      new.creator_user_id, 'payout', new.id,
      'payout:' || new.id::text, -new.amount_ghs, new.currency
    ) on conflict (idempotency_key) do nothing;
  elsif new.status = 'reversed' and old.status = 'paid' then
    insert into public.music_royalty_ledger (
      creator_user_id, entry_type, source_reference_id,
      idempotency_key, amount_ghs, currency, adjustment_note
    ) values (
      new.creator_user_id, 'adjustment', new.id,
      'payout-reversal:' || new.id::text, new.amount_ghs, new.currency, 'Confirmed payout reversal'
    ) on conflict (idempotency_key) do nothing;
  end if;
  return new;
end;
$fn$;

create or replace function public.get_music_creator_financial_summary()
returns table (
  ledger_balance_ghs numeric,
  paid_sales_count bigint,
  paid_sales_net_ghs numeric,
  payout_request_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  return query
    select
      coalesce((select sum(l.amount_ghs) from public.music_royalty_ledger l where l.creator_user_id = v_uid), 0),
      coalesce((select count(*) from public.music_paid_sound_orders o where o.creator_user_id = v_uid and o.status = 'paid'), 0),
      coalesce((select sum(o.creator_net_ghs) from public.music_paid_sound_orders o where o.creator_user_id = v_uid and o.status = 'paid'), 0),
      coalesce((select count(*) from public.music_creator_payout_requests p where p.creator_user_id = v_uid), 0);
end;
$fn$;

create or replace function public.prevent_music_royalty_ledger_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  raise exception 'The creator ledger is append-only. Post a compensating entry instead.';
  return null;
end;
$fn$;

create or replace function public.prevent_music_royalty_rate_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $fn$
begin
  raise exception 'Royalty rate versions are immutable. Publish a new effective version instead.';
  return null;
end;
$fn$;

drop trigger if exists music_paid_sound_order_validate on public.music_paid_sound_orders;
create trigger music_paid_sound_order_validate
  before insert on public.music_paid_sound_orders
  for each row execute function public.validate_music_paid_sound_order();

drop trigger if exists music_creator_payout_request_validate on public.music_creator_payout_requests;
create trigger music_creator_payout_request_validate
  before insert on public.music_creator_payout_requests
  for each row execute function public.validate_music_creator_payout_request();

drop trigger if exists music_stream_royalty_after_insert on public.music_stream_events;
create trigger music_stream_royalty_after_insert
  after insert on public.music_stream_events
  for each row execute function public.accrue_music_stream_royalty();

drop trigger if exists music_paid_sound_ledger_after_update on public.music_paid_sound_orders;
create trigger music_paid_sound_ledger_after_update
  before update of status on public.music_paid_sound_orders
  for each row execute function public.record_music_paid_sound_ledger();

drop trigger if exists music_creator_payout_ledger_after_update on public.music_creator_payout_requests;
create trigger music_creator_payout_ledger_after_update
  after update of status on public.music_creator_payout_requests
  for each row execute function public.record_music_payout_ledger();

drop trigger if exists music_royalty_rate_versions_immutable on public.music_royalty_rate_versions;
create trigger music_royalty_rate_versions_immutable
  before update or delete on public.music_royalty_rate_versions
  for each row execute function public.prevent_music_royalty_rate_mutation();

drop trigger if exists music_royalty_ledger_immutable on public.music_royalty_ledger;
create trigger music_royalty_ledger_immutable
  before update or delete on public.music_royalty_ledger
  for each row execute function public.prevent_music_royalty_ledger_mutation();

alter table public.music_royalty_rate_versions enable row level security;
alter table public.music_royalty_ledger enable row level security;
alter table public.music_creator_payment_destinations enable row level security;
alter table public.music_paid_sound_orders enable row level security;
alter table public.music_creator_payout_requests enable row level security;
alter table public.music_payment_webhook_events enable row level security;
alter table public.music_playback_sessions enable row level security;

drop policy if exists "Authenticated users can read effective music royalty rates" on public.music_royalty_rate_versions;
create policy "Authenticated users can read effective music royalty rates"
  on public.music_royalty_rate_versions for select to authenticated
  using (effective_from <= now() and (effective_until is null or effective_until > now()));

drop policy if exists "Creators can read their own music royalty ledger" on public.music_royalty_ledger;
create policy "Creators can read their own music royalty ledger"
  on public.music_royalty_ledger for select to authenticated
  using (creator_user_id = (select auth.uid()));

drop policy if exists "Buyers and creators can read paid sound orders" on public.music_paid_sound_orders;
create policy "Buyers and creators can read paid sound orders"
  on public.music_paid_sound_orders for select to authenticated
  using (buyer_user_id = (select auth.uid()) or creator_user_id = (select auth.uid()));

drop policy if exists "Creators can read their own payout requests" on public.music_creator_payout_requests;
create policy "Creators can read their own payout requests"
  on public.music_creator_payout_requests for select to authenticated
  using (creator_user_id = (select auth.uid()));

revoke all on public.music_royalty_rate_versions from anon, authenticated;
revoke all on public.music_royalty_ledger from anon, authenticated;
revoke all on public.music_creator_payment_destinations from anon, authenticated;
revoke all on public.music_paid_sound_orders from anon, authenticated;
revoke all on public.music_creator_payout_requests from anon, authenticated;
revoke all on public.music_payment_webhook_events from anon, authenticated;

grant select on public.music_royalty_rate_versions to authenticated;
grant select on public.music_royalty_ledger to authenticated;
grant select on public.music_paid_sound_orders to authenticated;
grant select on public.music_creator_payout_requests to authenticated;

grant select, insert on public.music_royalty_rate_versions to service_role;
grant select, insert, update on public.music_creator_payment_destinations to service_role;
grant select, insert, update on public.music_paid_sound_orders to service_role;
grant select, insert, update on public.music_creator_payout_requests to service_role;
grant select, insert, update on public.music_payment_webhook_events to service_role;
grant select, insert on public.music_royalty_ledger to service_role;

revoke all on function public.get_music_creator_financial_summary() from public, anon;
grant execute on function public.get_music_creator_financial_summary() to authenticated;
revoke all on function public.start_music_playback_session(uuid) from public, anon;
revoke all on function public.heartbeat_music_playback_session(uuid, text) from public, anon;
revoke all on function public.complete_music_playback_session(uuid, text) from public, anon;
grant execute on function public.start_music_playback_session(uuid) to authenticated;
grant execute on function public.heartbeat_music_playback_session(uuid, text) to authenticated;
grant execute on function public.complete_music_playback_session(uuid, text) to authenticated;
revoke all on function public.validate_music_paid_sound_order() from public, anon, authenticated;
revoke all on function public.validate_music_creator_payout_request() from public, anon, authenticated;
revoke all on function public.accrue_music_stream_royalty() from public, anon, authenticated;
revoke all on function public.record_music_paid_sound_ledger() from public, anon, authenticated;
revoke all on function public.record_music_payout_ledger() from public, anon, authenticated;
revoke all on function public.prevent_music_royalty_ledger_mutation() from public, anon, authenticated;
revoke all on function public.prevent_music_royalty_rate_mutation() from public, anon, authenticated;
