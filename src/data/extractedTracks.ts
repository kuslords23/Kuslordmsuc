import type { Track } from './music'

/**
 * Tracks that were unpacked from a zip file.
 *
 * This file must always exist, even when it's empty, because
 * other files import from it. The unzip script overwrites it
 * automatically when a zip containing tracks.json is added.
 */
export const extractedTracks: Track[] = []