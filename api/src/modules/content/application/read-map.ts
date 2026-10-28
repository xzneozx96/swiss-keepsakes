import type { ContentLanguage } from '@sk/domain/content'
import type { PublicPinRow, ReadDeps } from '../read-ports.ts'
import type { PublicMap } from './public-view.ts'
import { toMapItem } from './public-view.ts'
import { createTtlCache } from './ttl-cache.ts'

const mapTtlMs = 60_000

const newestFirst = (a: PublicPinRow, b: PublicPinRow) => b.firstPublishedAt.getTime() - a.firstPublishedAt.getTime() || (a.id < b.id ? 1 : -1)

// One list for all stores, newest first, cached per language for 60 s by the injected clock.
export function makeGetMap<T>({ uow, reads, clock }: ReadDeps<T>) {
  const cache = createTtlCache<PublicMap>(clock, mapTtlMs)
  return (language: ContentLanguage): Promise<PublicMap> => cache.get(language, async () => {
    const rows = await uow.run(tx => reads.listVisiblePins(tx))
    const now = clock.now()
    return { items: [...rows].sort(newestFirst).flatMap((row) => {
      const item = toMapItem(row, language, now)
      return item ? [item] : []
    }) }
  })
}
