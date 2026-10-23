import type { Track, Album } from '../data/music';
import { albums as defaultAlbums } from '../data/music';

/**
 * Load any extra tracks from an extracted tracks.json
 */
export function loadExtractedTracks(): Track[] {
  try {
    const data = require('../../src/data/tracks.json');
    // Convert to Track array
    if (Array.isArray(data)) {
      return data.map((t: any) => ({
        id: t.id || `extracted-${Math.random().toString(36).substr(2,9)}`,
        title: t.title || 'Untitled',
        artist: t.artist || 'Unknown Artist',
        album: t.album || 'Extracted',
        duration: t.duration || 180,
        audioUrl: t.audioUrl || '',
        cover: t.cover || 'linear-gradient(135deg, #333, #666)',
        genre: t.genre,
        isSportsAnthem: t.isSportsAnthem,
        matchVibe: t.matchVibe,
        likes: t.likes || 0,
      }));
    }
  } catch (e) {
    // File doesn't exist – that's fine
  }
  return [];
}