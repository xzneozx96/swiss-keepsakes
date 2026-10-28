import type { Localized, PublishGap, StayTag } from './localized.ts'
import { hasText, slugCoversTitle } from './localized.ts'

export type TourStatus = 'draft' | 'published'

export interface TourGuideDoc {
  title: Localized
  summary: Localized
  meetingPoint: Localized
  sections: { id: string, heading: Localized, body: Localized }[]
}

export interface TourGuideStop {
  id: string
  position: number
  latitude: number
  longitude: number
  title: Localized
  text: Localized
  minutesFromStart: number | null
  mediaId: string | null
  placeId: string | null
}

export interface TourGuide {
  id: string
  storeId: string
  status: TourStatus
  slug: Localized | null
  stayTag: StayTag
  interests: string[]
  durationMinutes: number | null
  coverMediaId: string | null
  pdfMediaId: string | null
  keepsakeProductIds: string[]
  stops: TourGuideStop[]
  draft: TourGuideDoc | null
  published: TourGuideDoc | null
  rowVersion: number
  createdAt: Date
  updatedAt: Date
}

export function tourPublishGaps(input: { title: Localized, slug: Localized | null, pdfMediaId: string | null }): PublishGap[] {
  const gaps: PublishGap[] = []
  if (!hasText(input.title)) gaps.push('title')
  if (!hasText(input.slug) || (hasText(input.title) && !slugCoversTitle(input.slug, input.title))) gaps.push('slug')
  if (input.pdfMediaId === null) gaps.push('pdf')
  return gaps
}

export function canDeleteTour(tour: Pick<TourGuide, 'status' | 'published'>): boolean {
  return tour.status === 'draft' && tour.published === null
}
