# Drop your zip files here

Put any `.zip` file in this folder and the app will unpack it for you.

## How to use it

1. Copy your `.zip` into this `zips/` folder.
2. Run `npm run dev` (or `npm run integrate` on its own).
3. The script unpacks the zip and files everything where it belongs.
4. The zip is renamed to `something.done.zip` so it is not unpacked twice.

## Where things end up

| What's inside the zip      | Where it goes                   |
|----------------------------|---------------------------------|
| `.mp3`, `.wav`, `.m4a`     | `public/audio/`                 |
| `.png`, `.jpg`, `.svg`     | `public/images/`                |
| `.tsx`, `.ts`              | `src/` (or `src/components/`)   |
| `.css`                     | `src/`                          |
| `tracks.json`              | becomes `src/data/extractedTracks.ts` |
| `albums.json`              | becomes `src/data/extractedAlbums.ts` |
| anything else              | `src/`                          |

## Just a bundle of songs?

You don't need a `tracks.json`. If the zip only contains audio files,
the script reads the file names and builds the track list for you.
A file named `Royal Anthem - Kus Lords.mp3` becomes a track titled
"Royal Anthem" by "Kus Lords".