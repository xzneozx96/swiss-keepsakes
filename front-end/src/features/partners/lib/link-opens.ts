import type { QueriedData } from '@/features/demo/types'

import { DEMO_START } from '@/features/demo/clock'
import { prng } from '@/features/merchant/today/lib/demo-history'

const DAY_MS = 86_400_000
const HISTORY_DAYS = 63

/** Average link opens a day per partner before the demo start; invented. */
const DAILY_OPENS: Record<string, number> = {
  'hotel-am-see': 5,
  'guide-marco': 4,
  'guide-sophie': 1.5,
}

export interface LinkOpen {
  partnerId: string
  at: string
}

/**
 * Opens of each partner's QR or link before the demo start, built once from a fixed seed so
 * every reload is the same. A QR scan is only seen as a link open (S12).
 */
const HISTORY_OPENS: readonly LinkOpen[] = (() => {
  const rand = prng(5_001)
  const opens: LinkOpen[] = []

  for (let day = HISTORY_DAYS; day >= 1; day--) {
    for (const [partnerId, mean] of Object.entries(DAILY_OPENS)) {
      const count = Math.round(mean * (0.4 + rand() * 1.2))

      for (let i = 0; i < count; i++) {
        // Between 08:00 and 21:00 Zurich time.
        const at
          = DEMO_START
            - day * DAY_MS
            - 2 * 3_600_000
            + (8 + rand() * 13) * 3_600_000

        opens.push({ partnerId, at: new Date(at).toISOString() })
      }
    }
  }

  return opens
})()

/** Every link open: the seeded history plus the opens made in this demo. */
export function linkOpens(data: Pick<QueriedData, 'referralVisits'>): LinkOpen[] {
  return [...HISTORY_OPENS, ...data.referralVisits]
}
