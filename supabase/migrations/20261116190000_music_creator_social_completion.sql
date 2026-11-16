-- Complete creator publishing, playlist collaboration acceptance and opt-in social sharing.
alter table public.music_radio_stations add column if not exists owner_id uuid references auth.users(id) on delete set null;
drop policy if exists "Station owners manage their stations" on public.music_radio_stations;
create policy "Station owners manage their stations" on public.music_radio_stations for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Invited users accept playlist collaboration" on public.music_playlist_collaborators;
create policy "Invited users accept playlist collaboration" on public.music_playlist_collaborators for update to authenticated using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid() and status in ('accepted','declined'));
create table if not exists public.music_social_shares (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 track_post_id uuid references public.feed_posts(id) on delete set null,
 playlist_id uuid references public.music_playlists(id) on delete set null,
 body text not null default '',
 visibility text not null default 'public' check (visibility in ('public','followers')),
 created_at timestamptz not null default now(),
 constraint music_social_shares_has_content check (track_post_id is not null or playlist_id is not null or length(trim(body)) > 0)
);
create table if not exists public.music_social_share_likes (
 share_id uuid not null references public.music_social_shares(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(share_id,user_id)
);
alter table public.music_social_shares enable row level security;
alter table public.music_social_share_likes enable row level security;
drop policy if exists "Users create own music shares" on public.music_social_shares;
create policy "Users create own music shares" on public.music_social_shares for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users manage own music shares" on public.music_social_shares;
create policy "Users manage own music shares" on public.music_social_shares for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Public reads public music shares" on public.music_social_shares;
create policy "Public reads public music shares" on public.music_social_shares for select using (visibility = 'public');
drop policy if exists "Users like music shares" on public.music_social_share_likes;
create policy "Users like music shares" on public.music_social_share_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Public reads share likes" on public.music_social_share_likes;
create policy "Public reads share likes" on public.music_social_share_likes for select using (true);
create index if not exists music_social_shares_created_idx on public.music_social_shares(created_at desc);
grant select,insert,update,delete on public.music_social_shares, public.music_social_share_likes to authenticated;
grant select on public.music_social_shares, public.music_social_share_likes to anon;
