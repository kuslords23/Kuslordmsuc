-- KUS-Lords Music platform expansion: curated radio, podcasts, subscriptions and progress.
create table if not exists public.music_radio_stations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  genre text not null,
  cover_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.music_podcast_shows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  cover_url text,
  publisher text not null default '',
  category text not null default 'General',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.music_podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.music_podcast_shows(id) on delete cascade,
  title text not null,
  description text not null default '',
  audio_url text not null,
  cover_url text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.music_podcast_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references public.music_podcast_shows(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, show_id)
);
create table if not exists public.music_podcast_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid not null references public.music_podcast_episodes(id) on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id, episode_id)
);
create table if not exists public.music_artist_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_profile_id uuid not null references public.artist_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, artist_profile_id)
);
create index if not exists music_podcast_episodes_show_published_idx on public.music_podcast_episodes(show_id, is_published, published_at desc);
create index if not exists music_podcast_shows_published_idx on public.music_podcast_shows(is_published, created_at desc);
alter table public.music_radio_stations enable row level security;
alter table public.music_podcast_shows enable row level security;
alter table public.music_podcast_episodes enable row level security;
alter table public.music_podcast_subscriptions enable row level security;
alter table public.music_podcast_progress enable row level security;
alter table public.music_artist_follows enable row level security;
drop policy if exists "Public can read active radio stations" on public.music_radio_stations;
create policy "Public can read active radio stations" on public.music_radio_stations for select using (is_active = true);
drop policy if exists "Show owners manage podcast shows" on public.music_podcast_shows;
create policy "Show owners manage podcast shows" on public.music_podcast_shows for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Public can read published podcast shows" on public.music_podcast_shows;
create policy "Public can read published podcast shows" on public.music_podcast_shows for select using (is_published = true);
drop policy if exists "Show owners manage podcast episodes" on public.music_podcast_episodes;
create policy "Show owners manage podcast episodes" on public.music_podcast_episodes for all to authenticated using (exists(select 1 from public.music_podcast_shows s where s.id = show_id and s.owner_id = auth.uid())) with check (exists(select 1 from public.music_podcast_shows s where s.id = show_id and s.owner_id = auth.uid()));
drop policy if exists "Public can read published podcast episodes" on public.music_podcast_episodes;
create policy "Public can read published podcast episodes" on public.music_podcast_episodes for select using (is_published = true and exists(select 1 from public.music_podcast_shows s where s.id = show_id and s.is_published = true));
drop policy if exists "Users manage own podcast subscriptions" on public.music_podcast_subscriptions;
create policy "Users manage own podcast subscriptions" on public.music_podcast_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users manage own podcast progress" on public.music_podcast_progress;
create policy "Users manage own podcast progress" on public.music_podcast_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users manage own artist follows" on public.music_artist_follows;
create policy "Users manage own artist follows" on public.music_artist_follows for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select on public.music_radio_stations, public.music_podcast_shows, public.music_podcast_episodes to anon, authenticated;
grant all on public.music_radio_stations, public.music_podcast_shows, public.music_podcast_episodes, public.music_podcast_subscriptions, public.music_podcast_progress, public.music_artist_follows to authenticated;
revoke all on public.music_podcast_subscriptions, public.music_podcast_progress, public.music_artist_follows from anon;
