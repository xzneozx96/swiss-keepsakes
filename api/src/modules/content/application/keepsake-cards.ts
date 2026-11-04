import type { ContentLanguage } from '@sk/domain/content'
import type { PublicStoryKeepsakeCard } from '../read-ports.ts'

// The keepsake cards of a story, from the catalog's public list (ADR-013: wired in main.ts, no join into catalog tables).
// The list holds only published keepsakes, so an unpublished or archived one is absent; a sold-out one stays, flagged.
// The cards come back in the order of `ids`; an id the list lacks is skipped. Only the fields of a card are copied.
export function makeKeepsakeCards(listKeepsakes: (language: ContentLanguage) => Promise<{ items: PublicStoryKeepsakeCard[] }>) {
  return async (ids: string[], language: ContentLanguage): Promise<PublicStoryKeepsakeCard[]> => {
    const { items } = await listKeepsakes(language)
    const byId = new Map(items.map(item => [item.id, { id: item.id, slug: item.slug, name: item.name, cover: item.cover, soldOut: item.soldOut }]))
    return ids.flatMap(id => byId.get(id) ?? [])
  }
}
