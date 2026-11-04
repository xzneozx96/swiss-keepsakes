/** The five fixed interests (PRD §3.3) in the guest list order, each with a photo of what it names (docs/ux/search-design.md §3). Fixed in code until the merchant can set them. */
export const INTEREST_TILES = [
  { code: 'history-culture', photo: 'musegg-wall' },
  { code: 'food-drink', photo: 'pralines' },
  { code: 'lake-mountains', photo: 'lake-steamboat' },
  { code: 'shopping-keepsakes', photo: 'vx-chapel-bridge' },
  { code: 'local-activities', photo: 'lucerne-old-town' },
] as const

export type InterestCode = (typeof INTEREST_TILES)[number]['code']
