import type { TourGuideWriteBody, TourGuide as TourView } from '@sk/api-contract'
import type { TourGuide, TourGuideDoc } from '@sk/domain/content'
import type { TourChanges } from '../ports.ts'

function docView(doc: TourGuideDoc | null): TourView['draft'] {
  return doc && {
    title: doc.title,
    summary: doc.summary,
    meetingPoint: doc.meetingPoint,
    sections: doc.sections.map(section => ({ id: section.id, heading: section.heading, body: section.body })),
  }
}

// The response shape of a tour guide: every field listed, the dates as ISO strings.
export function tourView(tour: TourGuide): TourView {
  return {
    id: tour.id,
    storeId: tour.storeId,
    status: tour.status,
    slug: tour.slug,
    stayTag: tour.stayTag,
    interests: tour.interests,
    durationMinutes: tour.durationMinutes,
    coverMediaId: tour.coverMediaId,
    pdfMediaId: tour.pdfMediaId,
    keepsakeProductIds: tour.keepsakeProductIds,
    stops: tour.stops.map(stop => ({
      id: stop.id,
      position: stop.position,
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: stop.title,
      text: stop.text,
      minutesFromStart: stop.minutesFromStart,
      mediaId: stop.mediaId,
      placeId: stop.placeId,
    })),
    draft: docView(tour.draft),
    published: docView(tour.published),
    rowVersion: tour.rowVersion,
    createdAt: tour.createdAt.toISOString(),
    updatedAt: tour.updatedAt.toISOString(),
  }
}

// The body leaves out a stop's texts and links; the repository wants each present, as an empty map or null.
// A draft stays as sent: a field left out keeps its stored text, the repository merges.
export function tourChanges(body: TourGuideWriteBody): TourChanges {
  const { stops, ...rest } = body
  if (stops === undefined)
    return rest
  return {
    ...rest,
    stops: stops.map(stop => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
      title: stop.title ?? {},
      text: stop.text ?? {},
      minutesFromStart: stop.minutesFromStart ?? null,
      mediaId: stop.mediaId ?? null,
      placeId: stop.placeId ?? null,
    })),
  }
}
