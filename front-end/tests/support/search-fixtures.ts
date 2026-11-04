import type { PublicKeepsakeCard, PublicMapItem, PublicTourCard } from '@sk/api-contract'

let n = 0
const nonWord = /\W+/g

function id() {
  n += 1

  return `0190b000-0000-7000-8000-${String(n).padStart(12, '0')}`
}

const notice = { language: 'en', requestedLanguage: 'en', fallback: false, availableLanguages: ['en'] } satisfies Pick<PublicTourCard, 'language' | 'requestedLanguage' | 'fallback' | 'availableLanguages'>

/** A pin of the public map list; every field can be overridden. */
export function mapItem(over: Partial<PublicMapItem> & { title: string }): PublicMapItem {
  return {
    id: id(),
    slug: over.title.toLowerCase().replace(nonWord, '-'),
    latitude: 47.05,
    longitude: 8.3,
    language: 'en',
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    nextDate: null,
    hasMainStory: false,
    mainStorySlug: null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: false,
    tip: '',
    ...over,
  }
}

/** A tour card of the public tours list. */
export function tourCard(over: Partial<PublicTourCard> & { title: string }): PublicTourCard {
  return {
    id: id(),
    slug: over.title.toLowerCase().replace(nonWord, '-'),
    stayTag: 'both',
    interests: [],
    durationMinutes: 90,
    coverKey: null,
    ...notice,
    ...over,
  }
}

/** A keepsake card of the public keepsake list. */
export function keepsakeCard(over: Partial<PublicKeepsakeCard> & { name: string }): PublicKeepsakeCard {
  return {
    id: id(),
    slug: over.name.toLowerCase().replace(nonWord, '-'),
    cover: null,
    soldOut: false,
    ...notice,
    ...over,
  }
}
