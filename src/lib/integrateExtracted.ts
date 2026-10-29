import type { Track } from '../data/music'
import { extractedTracks } from '../data/extractedTracks'

/**
 * Returns any tracks that were unpacked from a zip.
 * Guarded so a bad or empty file can never crash the app.
 */
export function loadExtractedTracks(): Track[] {
  try {
    return Array.isArray(extractedTracks) ? extractedTracks : []
  } catch {
    return []
  }
}