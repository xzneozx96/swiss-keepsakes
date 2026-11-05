import type { ContentLanguage } from '@sk/domain/content'
import type { ReadDeps, TourPageKey } from '../read-ports.ts'
import type { Result } from './failure.ts'
import type { PublicTour, PublicTourPage } from './public-view.ts'
import { fail, ok } from './failure.ts'
import { toPublicTour, toTourCardFor } from './public-view.ts'

export interface ListToursQuery {
  language: ContentLanguage
  limit?: number | undefined
  after?: TourPageKey | undefined
}

// Newest first, the id being the key (ADR-033): the repository orders and pages it.
export function makeListTours<T>({ uow, reads, publicUrl }: ReadDeps<T>) {
  return async ({ language, limit, after }: ListToursQuery): Promise<PublicTourPage> => {
    const found = await uow.run(tx => reads.pagePublishedTours(tx, { limit, after }))
    return { items: found.rows.flatMap((row) => {
      const card = toTourCardFor(row, language, publicUrl)
      return card ? [card] : []
    }), total: found.total, next: found.next }
  }
}

export function makeGetTour<T>({ uow, reads, publicUrl }: ReadDeps<T>) {
  return async (slug: string, language: ContentLanguage): Promise<Result<PublicTour>> => {
    const row = await uow.run(tx => reads.findPublishedTourBySlug(tx, slug, language))
    const tour = row && toPublicTour(row, language, publicUrl)
    return tour ? ok(tour) : fail({ reason: 'not-found' })
  }
}
