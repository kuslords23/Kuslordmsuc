-- Creator publishing metadata and production-safe creator economy foundation.
-- No provider is configured by this migration. Orders and payouts remain server-owned
-- records until a real payment provider and merchant account are verified.

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

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.feed_posts'::regclass
      and conname = 'feed_posts_paid_sound_price_positive'
  ) then
    alter table public.feed_posts
      add constraint feed_posts_paid_sound_price_positive
      check (paid_sound_price_ghs is null or paid_sound_price_ghs > 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.feed_posts'::regclass
      and conname = 'feed_posts_paid_sound_requires_price'
  ) then
    alter table public.feed_posts
      add constraint feed_posts_paid_sound_requires_price
      check (not is_paid_sound or paid_sound_price_ghs is not null);
  end if;
end $$;

create table if not exists public.music_royalty_rate_versions (
  id uuid primary key default gen_random_uuid(),
  currency text not null default 'GHS' check (currency = 'GHS'),
  amount_per_verified_stream_ghs numeric(18,6) not null check (amount_per_verified_stream_ghs > 0),
  direct_stream_threshold_seconds integer not null default 30 check (direct_stream_threshold_seconds >= 30),
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
  stream_event_id uuid not null unique references public.music_stream_events(id) on delete restrict,
  track_post_id uuid not null references public.feed_posts(id) on delete restrict,
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  rate_version_id uuid not null references public.music_royalty_rate_versions(id) on delete restrict,
  amount_ghs numeric(18,6) not null check (amount_ghs > 0),
  currency text not null default 'GHS' check (currency = 'GHS'),
  created_at timestamptz not null default now()
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
  currency text not null default 'GHS' check (currency = 'GHS'),
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','disputed')),
  provider text,
  provider_checkout_ref text,
  provider_payment_ref text,
  idempotency_key text not null,
  license_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_user_id, idempotency_key)
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
  status text not null default 'requested' check (status in ('requested','reviewing','processing','paid','failed','cancelled')),
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

-- A verified stream creates a royalty only when an operator has configured
-- an effective rate and the uploaded track explicitly opted into monetization.
-- The unique stream_event_id makes accrual idempotent.
create or replace function public.accrue_music_stream_royalty()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_id uuid;
  v_monetization_enabled boolean;
  v_rate public.music_royalty_rate_versions%rowtype;
begin
  if new.source <> 'direct' then
    return new;
  end if;

  select
    case
      when f.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then f.user_id::uuid
      else null
    end,
    coalesce(f.monetization_enabled, false)
  into v_creator_id, v_monetization_enabled
  from public.feed_posts f
  where f.id = new.track_post_id
    and f.post_type = 'audio';

  if v_creator_id is null or not coalesce(v_monetization_enabled, false) then
    return new;
  end if;

  select *
  into v_rate
  from public.music_royalty_rate_versions r
  where r.effective_from <= new.created_at
    and (r.effective_until is null or r.effective_until > new.created_at)
  order by r.effective_from desc
  limit 1;

  if not found then
    return new;
  end if;

  insert into public.music_royalty_ledger (
    stream_event_id, track_post_id, creator_user_id, rate_version_id, amount_ghs, currency
  ) values (
    new.id, new.track_post_id, v_creator_id, v_rate.id,
    v_rate.amount_per_verified_stream_ghs, v_rate.currency
  )
  on conflict (stream_event_id) do nothing;

  return new;
end;
$$;

drop trigger if exists music_stream_royalty_after_insert on public.music_stream_events;
create trigger music_stream_royalty_after_insert
  after insert on public.music_stream_events
  for each row execute function public.accrue_music_stream_royalty();

alter table public.music_royalty_rate_versions enable row level security;
alter table public.music_royalty_ledger enable row level security;
alter table public.music_creator_payment_destinations enable row level security;
alter table public.music_paid_sound_orders enable row level security;
alter table public.music_creator_payout_requests enable row level security;
alter table public.music_payment_webhook_events enable row level security;

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

-- New public-schema tables are not automatically exposed to the Data API on
-- current Supabase projects. Grant only the read paths protected by RLS.
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

revoke all on function public.accrue_music_stream_royalty() from public, anon, authenticated;
