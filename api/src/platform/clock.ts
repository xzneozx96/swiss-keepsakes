// Use cases and adapters read the time through this port, so a test can set it (api/test/support/manual-clock.ts).
export interface Clock {
  now: () => Date
}

export const systemClock: Clock = { now: () => new Date() }
