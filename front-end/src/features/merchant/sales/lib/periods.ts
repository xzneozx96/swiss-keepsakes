import type { DayRange } from "@/features/merchant/today/lib/analytics";

/** The Sales period picker: fixed periods ending today, all time, or a custom range. */
export const SALES_PERIODS = [
  "today",
  "yesterday",
  "7d",
  "28d",
  "month",
  "3m",
  "12m",
  "all",
  "custom",
] as const;
export type SalesPeriodId = (typeof SALES_PERIODS)[number];

/** The chart's bar size: hours for one day, then days, weeks or months as the range grows. */
export type Bucket = "hour" | "day" | "week" | "month";

export interface SalesRange extends DayRange {
  /**
   * Only count events up to this Zurich time of day ("HH:mm") on the last day: today so far
   * is compared with yesterday up to the same time.
   */
  until?: string;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);

  d.setUTCDate(d.getUTCDate() + days);

  return d.toISOString().slice(0, 10);
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const day = d.getUTCDate();

  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();

  d.setUTCDate(Math.min(day, last));

  return d.toISOString().slice(0, 10);
}

export function dayCount(r: DayRange): number {
  return (
    Math.round(
      (Date.parse(`${r.end}T12:00:00Z`) - Date.parse(`${r.start}T12:00:00Z`)) /
        86_400_000,
    ) + 1
  );
}

/** The same number of days straight before. */
function before(r: DayRange): DayRange {
  const n = dayCount(r);

  return { start: addDays(r.start, -n), end: addDays(r.start, -1) };
}

/**
 * The selected range and the one it is compared with (none for all time). `now` is the
 * Zurich time of day, "HH:mm".
 */
export function salesRanges(
  period: SalesPeriodId,
  today: string,
  now: string,
  firstDay: string,
  custom: DayRange | null,
): { current: SalesRange; previous: SalesRange | null } {
  const yesterday = addDays(today, -1);

  switch (period) {
    case "today":
      return {
        current: { start: today, end: today },
        previous: { start: yesterday, end: yesterday, until: now },
      };
    case "yesterday": {
      const r = { start: yesterday, end: yesterday };

      return { current: r, previous: before(r) };
    }
    case "7d":
    case "28d": {
      const r = {
        start: addDays(today, period === "7d" ? -6 : -27),
        end: today,
      };

      return { current: r, previous: before(r) };
    }
    case "month": {
      const start = `${today.slice(0, 8)}01`;
      const prevStart = addMonths(start, -1);
      const prevEnd = addMonths(today, -1);

      return {
        current: { start, end: today },
        previous: {
          start: prevStart,
          end: prevEnd >= start ? addDays(start, -1) : prevEnd,
        },
      };
    }
    case "3m":
    case "12m": {
      const months = period === "3m" ? 3 : 12;
      const r = { start: addDays(addMonths(today, -months), 1), end: today };

      return {
        current: r,
        previous: {
          start: addDays(addMonths(r.start, -months), 0),
          end: addDays(r.start, -1),
        },
      };
    }
    case "all":
      return { current: { start: firstDay, end: today }, previous: null };
    case "custom": {
      const r = custom ?? { start: addDays(today, -6), end: today };

      return { current: r, previous: before(r) };
    }
  }
}

export function bucketOf(r: DayRange): Bucket {
  const n = dayCount(r);

  return n <= 1 ? "hour" : n <= 62 ? "day" : n <= 190 ? "week" : "month";
}

export interface BucketSlot {
  key: string;
  /** The days it covers inside the range (hours: the day itself). */
  start: string;
  end: string;
  /** Shorter than a full week or month: cut by the range, or the month is not over. */
  partial: boolean;
}

const endOfMonth = (day: string) =>
  addDays(addMonths(`${day.slice(0, 8)}01`, 1), -1);

/** Weeks count back from the range's last day, so the latest week is always complete. */
function weekStart(day: string, r: DayRange): string {
  const back = Math.floor((dayCount({ start: day, end: r.end }) - 1) / 7);

  return addDays(r.end, -7 * back - 6);
}

/** The buckets of a range, in order. */
export function bucketSlots(r: DayRange, bucket: Bucket): BucketSlot[] {
  if (bucket === "hour")
    return Array.from({ length: 24 }, (_, h) => ({
      key: String(h).padStart(2, "0"),
      start: r.start,
      end: r.end,
      partial: false,
    }));
  const slots: BucketSlot[] = [];

  for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
    const key = bucketKey(d, "00:00", bucket, r);

    if (slots[slots.length - 1]?.key === key) continue;
    const fullEnd =
      bucket === "day"
        ? d
        : bucket === "week"
          ? addDays(key, 6)
          : endOfMonth(d);

    slots.push({
      key,
      start: d,
      end: fullEnd < r.end ? fullEnd : r.end,
      partial: key < r.start || fullEnd > r.end,
    });
  }

  return slots;
}

export function bucketKey(
  day: string,
  time: string,
  bucket: Bucket,
  r: DayRange,
): string {
  switch (bucket) {
    case "hour":
      return time.slice(0, 2);
    case "day":
      return day;
    case "week":
      return weekStart(day, r);
    case "month":
      return `${day.slice(0, 8)}01`;
  }
}

export const inSalesRange = (day: string, time: string, r: SalesRange) =>
  day >= r.start &&
  day <= r.end &&
  (!r.until || day < r.end || time <= r.until);
