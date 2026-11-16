-- Provider-sourced artist discovery profiles. These are catalogue entities, not verified creator accounts.
create table if not exists public.music_discovered_artists (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_artist_id text not null,
  name text not null,
  artwork_url text,
  embed_url text,
  profile_url text,
  genres text[] not null default '{}',
  popularity integer,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_artist_id)
);
create index if not exists music_discovered_artists_name_idx on public.music_discovered_artists using gin (to_tsvector('simple', name));
alter table public.music_discovered_artists enable row level security;
drop policy if exists "Public can read discovered music artists" on public.music_discovered_artists;
create policy "Public can read discovered music artists" on public.music_discovered_artists for select to anon, authenticated using (true);
grant select on public.music_discovered_artists to anon, authenticated;
revoke insert, update, delete on public.music_discovered_artists from anon, authenticated;
