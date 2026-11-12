import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const pkg = JSON.parse(read("../package.json"));
const app = read("../src/App.tsx");
const data = read("../src/lib/supabase.ts");
const upload = read("../src/components/UploadModal.tsx");
const model = read("../src/data/music.ts");
const artists = read("../src/components/ArtistDirectory.tsx");
const playlists = read("../src/components/PlaylistLibrary.tsx");
const playlistStore = read("../src/lib/playlists.ts");

assert.equal(pkg.scripts.predev, undefined, "dev startup must not auto-extract ZIP archives");
assert.match(pkg.scripts.dev, /vite/, "dev script must remain Vite");
assert.match(app, /event\.source !== window\.parent/, "bridge must accept messages only from parent");
assert.match(app, /allowedParentOrigins\.has\(event\.origin\)/, "bridge must enforce exact origin allowlist");
for (const command of ["SEARCH_TRACKS", "GET_TRACKS", "PLAY_TRACK", "SET_QUEUE", "ADD_TO_QUEUE", "CLEAR_QUEUE", "GET_STATE"]) {
  assert.ok(app.includes(`case '${command}'`), `missing bridge command: ${command}`);
}
assert.match(data, /\.eq\('post_type', 'audio'\)/, "library must filter canonical audio posts");
assert.match(data, /\.or\('media_url\.not\.is\.null,storage_path\.not\.is\.null'\)/, "library must support either media URL or storage path");
assert.match(data, /post_type: 'audio'/, "uploads must create canonical audio posts");
assert.match(data, /sound_title: params\.title\.trim\(\)/, "uploads must persist canonical sound title");
assert.match(data, /artist_profile_id: params\.artistProfileId \|\| null/, "uploads must persist selected artist profile");
assert.match(upload, /fetchOwnedArtistProfiles/, "upload UI must load the current user's artist profiles");
assert.match(upload, /Publish under artist profile/, "upload UI must expose artist profile selection");
assert.match(data, /fetchPublicArtistProfiles/, "public artist storefront data adapter must exist");
assert.match(artists, /Artist Directory/, "artist directory surface must exist");
assert.match(artists, /artistProfileId === selected.id/, "artist storefront must resolve its linked releases");
assert.match(playlists, /Your Playlists/, "playlist library UI must exist");
assert.match(playlistStore, /kus_music_playlists/, "playlist persistence must use SCN-compatible local storage key");
assert.match(model, /postId\?: string/, "track model must retain canonical feed post ID");
assert.match(model, /artistProfileId\?: string/, "track model must retain artist profile ID");

console.log("MUSIC-MEGA-001 source checks passed.");
