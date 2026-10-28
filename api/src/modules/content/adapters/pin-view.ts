import type { Pin as PinView, PinWriteBody } from '@sk/api-contract'
import type { Pin } from '@sk/domain/content'
import type { PinChanges } from '../ports.ts'

// The response shape of a pin: the same fields, with the dates as ISO strings.
export function pinView(pin: Pin): PinView {
  return {
    ...pin,
    firstPublishedAt: pin.firstPublishedAt?.toISOString() ?? null,
    createdAt: pin.createdAt.toISOString(),
    updatedAt: pin.updatedAt.toISOString(),
  }
}

// A date's times may be left out of the body; the repository wants them as null.
export function pinChanges(body: PinWriteBody): PinChanges {
  const { dates, ...rest } = body
  return dates === undefined
    ? rest
    : { ...rest, dates: dates.map(date => ({ ...date, startTime: date.startTime ?? null, endTime: date.endTime ?? null })) }
}
