-- Make the collaborative flag an actual permission boundary, not only a UI preference.
drop policy if exists "Collaborators edit shared playlist tracks" on public.music_playlist_tracks;
create policy "Collaborators edit shared playlist tracks" on public.music_playlist_tracks
for all to authenticated
using (
  exists (
    select 1 from public.music_playlists p
    where p.id = music_playlist_tracks.playlist_id
      and (
        p.user_id = auth.uid()
        or (
          p.is_collaborative = true
          and exists (
            select 1 from public.music_playlist_collaborators c
            where c.playlist_id = p.id
              and c.user_id = auth.uid()
              and c.status = 'accepted'
              and c.role = 'editor'
          )
        )
      )
  )
)
with check (
  exists (
    select 1 from public.music_playlists p
    where p.id = music_playlist_tracks.playlist_id
      and (
        p.user_id = auth.uid()
        or (
          p.is_collaborative = true
          and exists (
            select 1 from public.music_playlist_collaborators c
            where c.playlist_id = p.id
              and c.user_id = auth.uid()
              and c.status = 'accepted'
              and c.role = 'editor'
          )
        )
      )
  )
);
