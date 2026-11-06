import type { ContentLanguage } from '@sk/domain/content'
import type { PublicStoryKeepsakeCard } from '../read-ports.ts'

// The keepsake cards of a story, from the catalog's public read by id (ADR-013: wired in main.ts, no join into catalog tables).
// That read holds only published keepsakes, so an unpublished or archived one is absent; a sold-out one stays, flagged.
// The cards come back in the order of `ids`. Only the fields of a card are copied.
// The cards are an extra: when the catalog read fails (stock, media), the story still shows with no cards and `onError` hears of it.
export function makeKeepsakeCards(
  listKeepsakes: (ids: string[], language: ContentLanguage) => Promise<{ items: PublicStoryKeepsakeCard[] }>,
  onError: (error: unknown) => void,
) {
  return async (ids: string[], language: ContentLanguage): Promise<PublicStoryKeepsakeCard[]> => {
    try {
      const { items } = await listKeepsakes(ids, language)
      return items.map(item => ({ id: item.id, slug: item.slug, name: item.name, cover: item.cover, subtitle: item.subtitle, soldOut: item.soldOut }))
    }
    catch (error) {
      onError(error)
      return []
    }
  }
}
