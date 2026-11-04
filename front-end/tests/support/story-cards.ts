import type { PublicStoryCard } from '@sk/api-contract'

let n = 0

/** A public story card as the API returns it; every field the page reads can be overridden. */
export function storyCard(over: Partial<PublicStoryCard> & { title: string }): PublicStoryCard {
  n += 1
  return {
    id: `0190a000-0000-7000-8000-${String(n).padStart(12, '0')}`,
    slug: `story-${n}`,
    excerpt: `${over.title} excerpt`,
    readMinutes: 4,
    coverKey: null,
    cover: null,
    stayTag: 'both',
    interests: [],
    categories: [],
    publishedAt: '2026-10-01T00:00:00.000Z',
    language: 'en',
    requestedLanguage: 'en',
    fallback: false,
    availableLanguages: ['en'],
    ...over,
  }
}
