import type { InterestCode } from '@sk/domain/content'

import { interestCodes } from '@sk/domain/content'

/** The localStorage key of the onboarding answers (ADR-006). They never leave the browser. */
export const ONBOARDING_KEY = 'sk.onboarding'

export type Stay = 'short_stay' | 'multi_day'

const STAYS: readonly string[] = ['short_stay', 'multi_day']

/** `segment` holds the stay. Unanswered: no segment, no interests and `dismissedAt` null. Skipped: `dismissedAt` set. */
export interface OnboardingRecord {
  v: 1
  segment: Stay | null
  interests: InterestCode[]
  answeredAt: string | null
  dismissedAt: string | null
}

export const EMPTY_RECORD: OnboardingRecord = Object.freeze({ v: 1, segment: null, interests: [], answeredAt: null, dismissedAt: null }) as OnboardingRecord

function isInterest(value: unknown): value is InterestCode {
  return typeof value === 'string' && (interestCodes as readonly string[]).includes(value)
}

function dateOf(value: unknown): string | null {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null
}

/**
 * Reads a stored value as a record, and never throws. An unknown version or a malformed value gives the empty record;
 * a bad field is dropped without losing the rest: a segment other than `short_stay` or `multi_day` is null, interests
 * are filtered to the closed list once each, and a date that does not parse is null.
 */
export function parseRecord(raw: unknown): OnboardingRecord {
  if (typeof raw !== 'object' || raw === null || (raw as { v?: unknown }).v !== 1)
    return EMPTY_RECORD

  const { segment, interests, answeredAt, dismissedAt } = raw as Record<string, unknown>

  return {
    v: 1,
    segment: typeof segment === 'string' && STAYS.includes(segment) ? segment as Stay : null,
    interests: Array.isArray(interests) ? [...new Set(interests.filter(isInterest))] : [],
    answeredAt: dateOf(answeredAt),
    dismissedAt: dateOf(dismissedAt),
  }
}
