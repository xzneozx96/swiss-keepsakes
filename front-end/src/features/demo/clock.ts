/**
 * Demo clock: starts at 13.10.2026 10:00 Europe/Zurich and then runs with real elapsed time,
 * so timestamps differ and "within 10 minutes" checks behave normally. Reset restarts it.
 */
export const DEMO_START = Date.parse("2026-10-13T10:00:00+02:00");

export function demoNow(
  realStartedAt: number,
  realNow: number = Date.now(),
): Date {
  return new Date(DEMO_START + Math.max(0, realNow - realStartedAt));
}

/** ISO timestamp at a fixed offset from the demo start, for seed data. */
export function demoAt(offset: {
  days?: number;
  hours?: number;
  minutes?: number;
}): string {
  const ms =
    ((offset.days ?? 0) * 24 * 60 +
      (offset.hours ?? 0) * 60 +
      (offset.minutes ?? 0)) *
    60_000;

  return new Date(DEMO_START + ms).toISOString();
}
