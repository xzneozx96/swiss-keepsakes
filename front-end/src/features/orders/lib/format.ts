import type { IntlLocale } from "@/lib/format";

/**
 * Full numeric dates for orders, payments and receipts (owner decision 13.10.2026), always in
 * Europe/Zurich so a browser in another time zone shows the shop's deadline.
 */
export function formatOrderDate(isoDate: string, locale: IntlLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/** "14.10.2026, 10:30" for a timestamp such as a payment deadline. */
export function formatOrderDateTime(
  isoTime: string,
  locale: IntlLocale,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(new Date(isoTime));
}
