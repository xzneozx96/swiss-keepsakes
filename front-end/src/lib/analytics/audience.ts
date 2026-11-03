import type { Segment } from './closed-values'
import { INTERESTS, SEGMENTS } from './closed-values'

const ONBOARDING_KEY = 'sk.onboarding'

export interface Audience {
  segment?: Segment
  interests?: string[]
}

/**
 * The onboarding answers as closed values for the sender (ADR-006 record `sk.onboarding`, ADR-032). Read only, and it never
 * throws: no storage, a storage that throws, an unanswered, unknown-version or malformed record all give `{}`. A segment
 * outside `short_stay` and `multi_day` (`both` included) is left out; interests are filtered to the closed list, once each, and left out when none is left.
 */
export function readAudience(storage: Pick<Storage, 'getItem'> | null | undefined): Audience {
  try {
    const raw = storage?.getItem(ONBOARDING_KEY)

    if (!raw)
      return {}

    const stored: unknown = JSON.parse(raw)

    if (typeof stored !== 'object' || stored === null || (stored as { v?: unknown }).v !== 1)
      return {}

    const { segment, interests } = stored as { segment?: unknown, interests?: unknown }
    const audience: Audience = {}

    if (typeof segment === 'string' && (SEGMENTS as readonly string[]).includes(segment))
      audience.segment = segment as Segment

    if (Array.isArray(interests)) {
      const closed = [...new Set(interests.filter((item): item is string => typeof item === 'string' && INTERESTS.includes(item)))]

      if (closed.length > 0)
        audience.interests = closed
    }

    return audience
  }
  catch {
    return {}
  }
}
