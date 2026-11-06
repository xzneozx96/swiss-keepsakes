export const tourTabs = ['overview', 'itinerary', 'comments'] as const
export type TourTab = (typeof tourTabs)[number]

/**
 * The tour page's `?tab=` (owner, 06.11.2026). Overview is the default and stays out of the URL, so an
 * unknown value is the same as none. The key is always returned: the router merges the validated search
 * over the raw one, so a bare `{}` would let `?tab=photos` through untouched.
 */
export function parseTourSearch(search: Record<string, unknown>): { tab?: Exclude<TourTab, 'overview'> | undefined } {
  return { tab: search.tab === 'itinerary' || search.tab === 'comments' ? search.tab : undefined }
}
