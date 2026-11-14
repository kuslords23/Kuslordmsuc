export interface Track {
  id: string
  /** Canonical feed_posts.id for persisted SCN-compatible audio posts. */
  postId?: string
  userId?: string
  artistProfileId?: string
  audioContentHash?: string
  likes?: number
  liked?: boolean
  storagePath?: string
  coverStoragePath?: string
  title: string
  artist: string
  album: string
  duration: number
  audioUrl: string
  cover: string
  genre?: string
  mood?: string
  productionCredits?: string
  lyrics?: string
  monetizationEnabled?: boolean
  isPaidSound?: boolean
  paidSoundPriceGhs?: number
  paidSoundDescription?: string
}

export interface Album {
  id: string
  title: string
  artist: string
  description: string
  cover: string
  category: 'royals' | 'sports' | 'vibes' | 'chill' | 'afro'
  tracks: Track[]
}

/**
 * Music inventory is sourced exclusively from the shared Supabase feed_posts
 * audio records. These empty exports remain for compatibility with older
 * imports; they deliberately contain no demo or fabricated catalogue data.
 */
export const initialTracks: Track[] = []
export const albums: Album[] = []
export const allTracks: Track[] = []
