/** The values the product pages accept in their URLs, kept apart from the editor hooks so a route can validate them without loading the editors. */

/** M12's steps (owner, revision 2), in order; the ids are the `step` search param. */
export const GIFT_STEPS = [
  'basics',
  'options',
  'pickup',
  'payment',
  'story',
  'review',
] as const
export type GiftStep = (typeof GIFT_STEPS)[number]

/** M13's steps (owner, revision 2), in order; the ids are the `step` search param. */
export const TOUR_STEPS = [
  'basics',
  'details',
  'sections',
  'prices',
  'departures',
  'policies',
  'story',
  'review',
] as const
export type TourStep = (typeof TOUR_STEPS)[number]

/** The M11 tabs (D3); the ids are the `tab` search param of /store/products. */
export const PRODUCT_TABS = ['gifts', 'tours', 'pickup'] as const
export type ProductTab = (typeof PRODUCT_TABS)[number]

export function isProductTab(value: unknown): value is ProductTab {
  return PRODUCT_TABS.includes(value as ProductTab)
}
