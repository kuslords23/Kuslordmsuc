-- Applied as kus_music_cross_provider_playlist_entries on 2026-11-13.
create table if not exists public.music_playlist_catalog_entries (
 id uuid primary key default gen_random_uuid(),
 playlist_id uuid not null references public.music_playlists(id) on delete cascade,
 catalog_track_id uuid not null references public.music_catalog_tracks(id) on delete restrict,
 catalog_source_id uuid not null references public.music_catalog_sources(id) on delete restrict,
 position integer not null check(position>=0),
 added_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(playlist_id,catalog_source_id),unique(playlist_id,position)
);
create index if not exists music_playlist_catalog_entries_order_idx on public.music_playlist_catalog_entries(playlist_id,position);
create or replace function public.validate_music_playlist_catalog_entry() returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if not exists(select 1 from public.music_catalog_sources s join public.music_catalog_tracks t on t.id=s.catalog_track_id where s.id=new.catalog_source_id and s.catalog_track_id=new.catalog_track_id and s.availability='available' and t.status<>'unavailable') then
  raise exception 'The selected provider source is unavailable or does not match this catalogue track';
 end if;
 return new;
end;
$$;
revoke all on function public.validate_music_playlist_catalog_entry() from public,anon,authenticated;
drop trigger if exists music_playlist_catalog_entry_validate on public.music_playlist_catalog_entries;
create trigger music_playlist_catalog_entry_validate before insert or update on public.music_playlist_catalog_entries for each row execute function public.validate_music_playlist_catalog_entry();
alter table public.music_playlist_catalog_entries enable row level security;
drop policy if exists "Users read public or shared catalogue playlist entries" on public.music_playlist_catalog_entries;
create policy "Users read public or shared catalogue playlist entries" on public.music_playlist_catalog_entries for select to anon,authenticated using(exists(select 1 from public.music_playlists p where p.id=playlist_id and (p.visibility in('public','unlisted') or p.user_id=(select auth.uid()) or exists(select 1 from public.music_playlist_collaborators c where c.playlist_id=p.id and c.user_id=(select auth.uid()) and c.status='accepted'))));
grant select on public.music_playlist_catalog_entries to anon,authenticated;
grant insert,update,delete on public.music_playlist_catalog_entries to authenticated;
