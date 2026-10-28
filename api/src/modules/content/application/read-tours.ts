import type { ContentLanguage } from '@sk/domain/content'
import type { ReadDeps } from '../read-ports.ts'
import type { Result } from './failure.ts'
import type { PublicTour, PublicTourList } from './public-view.ts'
import { fail, ok } from './failure.ts'
import { toPublicTour, toTourCardFor } from './public-view.ts'

export function makeListTours<T>({ uow, reads }: ReadDeps<T>) {
  return async (language: ContentLanguage): Promise<PublicTourList> => {
    const rows = await uow.run(tx => reads.listPublishedTours(tx))
    return { items: rows.flatMap((row) => {
      const card = toTourCardFor(row, language)
      return card ? [card] : []
    }) }
  }
}

export function makeGetTour<T>({ uow, reads }: ReadDeps<T>) {
  return async (slug: string, language: ContentLanguage): Promise<Result<PublicTour>> => {
    const row = await uow.run(tx => reads.findPublishedTourBySlug(tx, slug, language))
    const tour = row && toPublicTour(row, language)
    return tour ? ok(tour) : fail({ reason: 'not-found' })
  }
}
