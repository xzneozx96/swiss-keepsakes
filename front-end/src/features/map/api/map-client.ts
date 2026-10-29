import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { answer, loadClient, timeout } from '@/features/data-client/api-transport'

type Language = 'en' | 'de'

/** The published, placed, not-yet-ended pins of every store as one list (ADR-006). No price field exists on it. */
export async function fetchMapPins(lang: Language): Promise<PublicMapItem[]> {
  const client = await loadClient()
  const { items } = await answer(client.GET('/api/public/map', { ...timeout(), params: { query: { lang } } }))

  return items
}

export async function fetchMapCategories(lang: Language): Promise<PublicCategory[]> {
  const client = await loadClient()
  const { items } = await answer(client.GET('/api/public/map-categories', { ...timeout(), params: { query: { lang } } }))

  return items
}
