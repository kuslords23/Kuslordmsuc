-- Per-user Kus-Lords Music preferences. Every row belongs to its authenticated owner.
create table if not exists public.music_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_user_settings_object_check check (jsonb_typeof(settings) = 'object')
);
alter table public.music_user_settings enable row level security;
drop policy if exists "Users manage own music settings" on public.music_user_settings;
create policy "Users manage own music settings"
  on public.music_user_settings
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
revoke all on public.music_user_settings from anon;
grant select, insert, update, delete on public.music_user_settings to authenticated;
