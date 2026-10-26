import { afterEach, describe, expect, it, vi } from 'vitest'

const originalZone = process.env.TZ
const ZONES = ['Pacific/Auckland', 'America/Los_Angeles', 'Europe/Zurich']

afterEach(() => {
  if (originalZone === undefined)
    delete process.env.TZ
  else
    process.env.TZ = originalZone
})

/** Loads the module fresh in a process zone: the shared formatters are cached, and a cached one keeps the zone it was built in. */
async function inZone(zone: string) {
  process.env.TZ = zone
  vi.resetModules()

  return import('@/lib/shop-dates')
}

describe('formatCalendarDay', () => {
  it('prints a YYYY-MM-DD day as that day, in any time zone', async () => {
    const printed = []

    for (const zone of ZONES)
      printed.push((await inZone(zone)).formatCalendarDay('2026-09-30', 'de-CH'))

    expect(printed).toEqual(['30.09.2026', '30.09.2026', '30.09.2026'])
  })
})

describe('formatZurichInstant', () => {
  it('prints the Zurich calendar day of an instant, the same in every time zone', async () => {
    // 22:30 UTC on 30.09 is already 01.10 in Zurich (summer time, UTC+2) but still 30.09 in Los Angeles.
    const printed = []

    for (const zone of ZONES)
      printed.push((await inZone(zone)).formatZurichInstant('2026-09-30T22:30:00Z', 'en-CH'))

    expect(printed).toEqual(['01.10.2026', '01.10.2026', '01.10.2026'])
  })
})
