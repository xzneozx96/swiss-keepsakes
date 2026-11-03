import type { PickupPlace } from '@sk/api-contract'

export type PickupView = 'active' | 'archived'

/**
 * The points a page shows. With no status ticked only active points are listed (as the keepsake list leaves archived
 * ones out); ticking Archived lists those, both ticked list both. The search (trimmed, any case) looks at the name and
 * the address in either language and narrows together with the status.
 */
export function filterPickup(active: PickupPlace[], archived: PickupPlace[], view: PickupView[], query: string): PickupPlace[] {
  const needle = query.trim().toLowerCase()
  const shown = [
    ...(view.length === 0 || view.includes('active') ? active : []),
    ...(view.includes('archived') ? archived : []),
  ]

  return needle === ''
    ? shown
    : shown.filter(place => [place.name.en, place.name.de, place.address.en, place.address.de].some(text => text?.toLowerCase().includes(needle)))
}
