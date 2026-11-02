import type { PinListItem, Pin as PinView, PinWriteBody } from '@sk/api-contract'
import type { Pin } from '@sk/domain/content'
import type { MerchantPinEntry, PinChanges } from '../ports.ts'
import { mediaView } from './media-view.ts'

// The response shape of a pin: the same fields, with the dates as ISO strings.
export function pinView(pin: Pin): PinView {
  return {
    ...pin,
    firstPublishedAt: pin.firstPublishedAt?.toISOString() ?? null,
    createdAt: pin.createdAt.toISOString(),
    updatedAt: pin.updatedAt.toISOString(),
  }
}

export function pinListItemView({ cover, ...entry }: MerchantPinEntry, publicUrl: (key: string) => string): PinListItem {
  return { ...entry, cover: cover && mediaView(cover, publicUrl), updatedAt: entry.updatedAt.toISOString() }
}

// A date's times and a photo's alt text may be left out of the body; the repository wants them as null and {}.
export function pinChanges(body: PinWriteBody): PinChanges {
  const { dates, photos, ...rest } = body
  return {
    ...rest,
    ...(dates === undefined ? {} : { dates: dates.map(date => ({ ...date, startTime: date.startTime ?? null, endTime: date.endTime ?? null })) }),
    ...(photos === undefined ? {} : { photos: photos.map(photo => ({ mediaId: photo.mediaId, alt: photo.alt ?? {} })) }),
  }
}
