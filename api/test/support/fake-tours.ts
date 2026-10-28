import type { TourGuide } from '@sk/domain/content'
import type { TourRepository } from '../../src/modules/content/ports.ts'
import { randomUUID } from 'node:crypto'
import { mergeDraft } from '../../src/modules/content/adapters/tour-repository.ts'

// An in-memory tour repository. It copies what the SQL one does with stops and drafts, but none of the database guards.
export function createFakeTours(): TourRepository<null> & { rows: Map<string, TourGuide>, removed: string[] } {
  const rows = new Map<string, TourGuide>()
  const removed: string[] = []
  const store = (tour: TourGuide) => {
    rows.set(tour.id, tour)
    return tour
  }
  const numbered = (stops: NonNullable<Parameters<TourRepository<null>['save']>[2]['stops']>) =>
    stops.map((s, i) => ({ id: randomUUID(), position: i + 1, ...s }))
  return {
    rows,
    removed,
    async insert(_tx, storeId, changes, at) {
      const { stops, draft, ...rest } = changes
      return store({
        id: randomUUID(),
        storeId,
        status: 'draft',
        slug: null,
        stayTag: 'both',
        interests: [],
        durationMinutes: null,
        coverMediaId: null,
        pdfMediaId: null,
        keepsakeProductIds: [],
        ...rest,
        stops: numbered(stops ?? []),
        draft: mergeDraft(null, draft),
        published: null,
        rowVersion: 1,
        createdAt: at,
        updatedAt: at,
      })
    },
    async findForUpdate(_tx, storeId, tourId) {
      const tour = rows.get(tourId)
      return tour?.storeId === storeId ? tour : undefined
    },
    async save(_tx, tour, changes, at) {
      const { stops, draft, ...rest } = changes
      return store({ ...tour, ...rest, stops: stops ? numbered(stops) : tour.stops, draft: mergeDraft(tour.draft ?? tour.published, draft), rowVersion: tour.rowVersion + 1, updatedAt: at })
    },
    async publish(_tx, tour, at) {
      return store({ ...tour, status: 'published', published: tour.draft ?? tour.published, draft: null, rowVersion: tour.rowVersion + 1, updatedAt: at })
    },
    async unpublish(_tx, tour, at) {
      return store({ ...tour, status: 'draft', rowVersion: tour.rowVersion + 1, updatedAt: at })
    },
    async remove(_tx, storeId, tourId) {
      if (rows.get(tourId)?.storeId !== storeId)
        return false
      removed.push(tourId)
      return rows.delete(tourId)
    },
  }
}
