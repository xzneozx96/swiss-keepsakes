import type { ContentLanguage } from '@sk/domain/content'
import type { ReadDeps } from '../read-ports.ts'
import type { Result } from './failure.ts'
import type { PublicStory, PublicStoryCard, PublicStoryList } from './public-view.ts'
import { fail, ok } from './failure.ts'
import { toPublicStory, toStoryCard } from './public-view.ts'

// Newest first by the date of the version carried; the id breaks a tie. No cache: a republished story reads at once.
const newestFirst = (a: PublicStoryCard, b: PublicStoryCard) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : a.id < b.id ? 1 : -1)

export function makeListStories<T>({ uow, reads }: ReadDeps<T>) {
  return async (language: ContentLanguage): Promise<PublicStoryList> => {
    const rows = await uow.run(tx => reads.listPublishedStories(tx))
    const items = rows.flatMap((row) => {
      const card = toStoryCard(row, language)
      return card ? [card] : []
    })
    return { items: items.sort(newestFirst) }
  }
}

export function makeGetStory<T>({ uow, reads }: ReadDeps<T>) {
  return async (slug: string, language: ContentLanguage): Promise<Result<PublicStory>> => {
    const row = await uow.run(tx => reads.findPublishedStoryBySlug(tx, slug, language))
    const story = row && toPublicStory(row, language)
    return story ? ok(story) : fail({ reason: 'not-found' })
  }
}
