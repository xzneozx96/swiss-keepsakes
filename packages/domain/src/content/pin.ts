import type { Localized, PublishGap, StayTag } from './localized.ts'
import { hasText, slugCoversTitle } from './localized.ts'

export type PinStatus = 'draft' | 'published' | 'hidden'

export interface PinDraft { title: Localized, tip: Localized }

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
  coverMediaId: string | null
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

/** A pin publishes with a title in one language, a location and a slug (ADR-029). No story or category is needed. */
export function pinPublishGaps(pin: Pick<Pin, 'slug' | 'latitude' | 'longitude'> & { title: Localized }): PublishGap[] {
  const gaps: PublishGap[] = []
  if (!hasText(pin.title)) gaps.push('title')
  if (pin.latitude === null || pin.longitude === null) gaps.push('location')
  if (hasText(pin.title) && !slugCoversTitle(pin.slug, pin.title)) gaps.push('slug')
  return gaps
}

/** Once a pin was published, hide it instead (ADR-015). */
export function canDeletePin(pin: Pick<Pin, 'firstPublishedAt'>): boolean {
  return pin.firstPublishedAt === null
}
