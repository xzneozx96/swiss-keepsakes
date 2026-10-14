import type { DayMode, Product } from "../types";

/** Calendar date in Europe/Zurich as YYYY-MM-DD (the business time zone, spec §1.5). */
export function zurichDate(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

function weekday(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

function isWeekend(isoDate: string): boolean {
  const day = weekday(isoDate);

  return day === 0 || day === 6;
}

/**
 * Both pickup places are closed on Sundays (their opening hours are Mon–Sat), so no
 * Sunday can be requested. One shop-wide rule until places get their own opening days.
 */
export function isPickupClosed(isoDate: string): boolean {
  return weekday(isoDate) === 0;
}

/**
 * Earliest pickup date for a request made at `requestedAt` (decision D9: preparation
 * counts from the request date). Working-day products skip Saturdays and Sundays;
 * public holidays are not skipped (PRD §7.2). A result on a closed day moves to the next
 * open day. The seller re-checks the date on acceptance.
 */
export function earliestPickupDate(
  preparationDays: number,
  dayMode: DayMode,
  requestedAt: Date,
): string {
  let date = zurichDate(requestedAt);
  let remaining = preparationDays;

  while (remaining > 0) {
    date = addDays(date, 1);
    if (dayMode === "calendar-days" || !isWeekend(date)) remaining -= 1;
  }

  while (isPickupClosed(date)) date = addDays(date, 1);

  return date;
}

export function productEarliestPickup(
  product: Product,
  requestedAt: Date,
): string {
  return earliestPickupDate(
    product.preparationDays,
    product.dayMode,
    requestedAt,
  );
}
