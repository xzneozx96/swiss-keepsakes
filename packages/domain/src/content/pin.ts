import type { ContentLanguage, Localized, PublishGap, StayTag } from './localized.ts'
import { hasText, slugCoversTitle } from './localized.ts'

export type PinStatus = 'draft' | 'published' | 'hidden'

/** `localTip` is the one line of local advice the home shows on a must-visit (decision 2026-10-28, home local briefing). */
export interface PinDraft { title: Localized, tip: Localized, localTip: Localized }

/** What a service pin gives a visitor on the home's "Sorted before you unpack" row. */
export const serviceTypes = ['water', 'toilets', 'connect', 'transport', 'lockers', 'cash'] as const
export type ServiceType = typeof serviceTypes[number]

/** The kind of a food and drink pin, which picks its icon. */
export const foodKinds = ['restaurant', 'cafe-bakery', 'pub-bar', 'market'] as const
export type FoodKind = typeof foodKinds[number]

/** One extra photo of a pin, in the order the merchant set. The main photo is `coverMediaId`. */
export interface PinPhoto { mediaId: string, alt: Localized }

/** One opening span of a weekday; `opens` and `closes` are local times. */
export interface WeeklySpan { day: number, opens: string, closes: string }

export interface PinDate {
  id: string
  firstDay: string
  lastDay: string
  startTime: string | null
  endTime: string | null
}

export interface Pin {
  id: string
  storeId: string
  status: PinStatus
  slug: Localized | null
  latitude: number | null
  longitude: number | null
  address: string | null
  weeklyHours: WeeklySpan[]
  stayTag: StayTag
  interests: string[]
  serviceType: ServiceType | null
  mustVisit: boolean
  foodKind: FoodKind | null
  coverMediaId: string | null
  coverAlt: Localized
  photos: PinPhoto[]
  /** The pin's one outbound link (ADR-011): a plain https address. */
  outboundUrl: string | null
  mainStoryGroupId: string | null
  categoryIds: string[]
  dates: PinDate[]
  draft: PinDraft | null
  published: PinDraft | null
  firstPublishedAt: Date | null
  rowVersion: number
  createdAt: Date
  updatedAt: Date
}

/** One row of the merchant list. `status` adds `ended` for a published pin whose dates are all over. */
export interface PinListEntry {
  id: string
  status: PinStatus | 'ended'
  title: Localized
  slug: Localized | null
  located: boolean
  categoryIds: string[]
  hasDates: boolean
  nextDate: PinDate | null
  stayTag: StayTag
  interests: string[]
  coverMediaId: string | null
  /** `published` is false when the story has no published version. */
  mainStory: { groupId: string, published: boolean } | null
  hasPendingChanges: boolean
  rowVersion: number
  updatedAt: Date
}

/** A story group the pin can name as its main story. */
export interface PinStoryOption {
  groupId: string
  kind: 'story' | 'editorial_review'
  title: Localized
  publishedLanguages: ContentLanguage[]
}

/** A pin publishes with a title in one language, a location and a slug (ADR-029). No story or category is needed. */
export function pinPublishGaps(pin: Pick<Pin, 'slug' | 'latitude' | 'longitude'> & { title: Localized }): PublishGap[] {
  const gaps: PublishGap[] = []
  if (!hasText(pin.title)) gaps.push('title')
  if (pin.latitude === null || pin.longitude === null) gaps.push('location')
  if (!hasText(pin.slug) || (hasText(pin.title) && !slugCoversTitle(pin.slug, pin.title))) gaps.push('slug')
  return gaps
}

/** Once a pin was published, hide it instead (ADR-015). */
export function canDeletePin(pin: Pick<Pin, 'firstPublishedAt'>): boolean {
  return pin.firstPublishedAt === null
}
