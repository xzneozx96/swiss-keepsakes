import type { ContentLanguage } from '@sk/domain/content'
import type { ReadDeps, StoryPageKey, StoryReadDeps } from '../read-ports.ts'
import type { Result } from './failure.ts'
import type { PublicStory, PublicStoryPage } from './public-view.ts'
import { fail, ok } from './failure.ts'
import { storyLanguage, toPublicStory, toStoryCard } from './public-view.ts'

export interface ListStoriesQuery {
  language: ContentLanguage
  category?: string | undefined
  limit?: number | undefined
  after?: StoryPageKey | undefined
}

// Newest first by the date of the version carried, the id breaking a tie: the repository orders and pages it (ADR-033).
// No cache: a republished story reads at once.
export function makeListStories<T>({ uow, reads, publicUrl }: ReadDeps<T>) {
  return async ({ language, category, limit, after }: ListStoriesQuery): Promise<PublicStoryPage> => {
    const found = await uow.run(tx => reads.pagePublishedStories(tx, { language, category: category ?? null, limit, after }))
    const items = found.rows.flatMap((row) => {
      const card = toStoryCard(row, language, publicUrl)
      return card ? [card] : []
    })
    return { items, total: found.total, next: found.next }
  }
}

// The story detail. The keepsake cards come through a port after the read transaction ends: the catalog opens its own.
export function makeGetStory<T>({ uow, reads, clock, publicUrl, keepsakeCards }: StoryReadDeps<T>) {
  return async (slug: string, language: ContentLanguage): Promise<Result<PublicStory>> => {
    const row = await uow.run(tx => reads.findPublishedStoryBySlug(tx, slug, language))
    const carriedIn = row && storyLanguage(row, language)
    if (!row || !carriedIn)
      return fail({ reason: 'not-found' })
    const cards = row.keepsakeProductIds.length > 0 ? await keepsakeCards(row.keepsakeProductIds, carriedIn) : []
    const story = toPublicStory(row, language, clock.now(), publicUrl, cards)
    return story ? ok(story) : fail({ reason: 'not-found' })
  }
}
