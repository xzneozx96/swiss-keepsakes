import type { PublicCategory, PublicMapItem } from '@sk/api-contract'
import type { PlaceDetail } from '@/features/map/lib/place-detail'

import { answer, loadClient, timeout } from '@/features/data-client/api-transport'
import { toPlaceDetail } from '@/features/map/lib/place-detail'

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

/** One pin with the facts its sheet shows. A pin that left the map since the list was read answers 404, which the sheet shows as a failed read. */
export async function fetchMapPin(id: string, lang: Language): Promise<PlaceDetail> {
  const client = await loadClient()
  const pin = await answer(client.GET('/api/public/places/{id}', { ...timeout(), params: { path: { id }, query: { lang } } }))

  return toPlaceDetail(pin)
}
