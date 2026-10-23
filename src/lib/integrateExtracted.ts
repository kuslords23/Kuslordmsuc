import type { Track } from '../data/music'
import { extractedTracks } from '../data/extractedTracks'

/**
 * Returns any tracks that were unpacked from a zip.
 * The unzip script regenerates src/data/extractedTracks.ts
 * from a tracks.json file inside the zip.
 */
export function loadExtractedTracks(): Track[] {
  return extractedTracks
}