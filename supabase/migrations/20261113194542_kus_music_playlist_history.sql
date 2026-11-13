-- Applied as kus_music_playlist_history on 2026-11-13.
create table if not exists public.music_playlist_play_history (
 id uuid primary key default gen_random_uuid(),
 playlist_id uuid not null references public.music_playlists(id) on delete cascade,
 track_post_id uuid not null references public.feed_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 played_at timestamptz not null default now()
);
create index if not exists music_playlist_play_history_user_time_idx on public.music_playlist_play_history(user_id,played_at desc);
create index if not exists music_playlist_play_history_playlist_time_idx on public.music_playlist_play_history(playlist_id,played_at desc);
alter table public.music_playlist_play_history enable row level security;
drop policy if exists "Users read own playlist play history" on public.music_playlist_play_history;
create policy "Users read own playlist play history" on public.music_playlist_play_history for select to authenticated using((select auth.uid())=user_id);
drop policy if exists "Users record own playlist plays" on public.music_playlist_play_history;
create policy "Users record own playlist plays" on public.music_playlist_play_history for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.music_playlists p where p.id=playlist_id and (p.user_id=(select auth.uid()) or p.visibility='public')));
grant select,insert on public.music_playlist_play_history to authenticated;
