import type { Track } from '../data/music'
import { extractedTracks } from '../data/extractedTracks'

/**
 * Returns any tracks that were unpacked from a zip.
 * Wrapped in a guard so a bad or missing file can never
 * take the whole app down with a blank screen.
 */
export function loadExtractedTracks(): Track[] {
  try {
    return Array.isArray(extractedTracks) ? extractedTracks : []
  } catch {
    return []
  }
}