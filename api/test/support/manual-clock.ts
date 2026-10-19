import type { Clock } from '../../src/platform/clock.ts'

export interface ManualClock extends Clock {
  advance: (ms: number) => void
}

export function createManualClock(start: Date): ManualClock {
  let now = start.getTime()
  return {
    now: () => new Date(now),
    advance: (ms) => {
      now += ms
    },
  }
}
