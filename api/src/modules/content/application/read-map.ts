import type { ContentLanguage } from '@sk/domain/content'
import type { PublicPinRow, ReadDeps } from '../read-ports.ts'
import type { PublicMap } from './public-view.ts'
import { toMapItem } from './public-view.ts'
import { createTtlCache } from './ttl-cache.ts'

const mapTtlMs = 60_000

const newestFirst = (a: PublicPinRow, b: PublicPinRow) => b.firstPublishedAt.getTime() - a.firstPublishedAt.getTime() || (a.id < b.id ? 1 : -1)

// The visible rows for all stores, newest first, cached per language for 60 s by the injected clock. The end-date rule runs on every request, so a pin whose end passes leaves the list at once.
export function makeGetMap<T>({ uow, reads, clock }: ReadDeps<T>) {
  const cache = createTtlCache<PublicPinRow[]>(clock, mapTtlMs)
  return async (language: ContentLanguage): Promise<PublicMap> => {
    const rows = await cache.get(language, async () => [...await uow.run(tx => reads.listVisiblePins(tx))].sort(newestFirst))
    const now = clock.now()
    return { items: rows.flatMap((row) => {
      const item = toMapItem(row, language, now)
      return item ? [item] : []
    }) }
  }
}
