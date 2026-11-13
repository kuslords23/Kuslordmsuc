-- Applied as kus_music_studio_project_updated_at on 2026-11-13.
create or replace function public.touch_music_studio_project_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_music_studio_project_updated_at() from public, anon, authenticated;
drop trigger if exists music_studio_projects_touch_updated_at on public.music_studio_projects;
create trigger music_studio_projects_touch_updated_at
before update on public.music_studio_projects
for each row execute function public.touch_music_studio_project_updated_at();
