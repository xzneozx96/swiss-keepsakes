// What the analytics use case needs. The counter keeps only a day, a referrer class and a segment (ADR-032).

export const referrerClasses = ['search', 'partner', 'social', 'direct', 'other'] as const
export type ReferrerClass = (typeof referrerClasses)[number]

export const segments = ['short_stay', 'multi_day'] as const
// Null is a visitor with no segment.
export type Segment = (typeof segments)[number] | null

export interface FunnelCounter {
  // Adds one to the day's counter for these values. `day` is an ISO date, the Europe/Zurich day.
  countOrderSubmit: (day: string, referrerClass: ReferrerClass, segment: Segment) => Promise<void>
}

export class InvalidOrderSubmit extends Error {
  constructor(reason: string) {
    super(`An order submit cannot be counted: ${reason}`)
    this.name = 'InvalidOrderSubmit'
  }
}
