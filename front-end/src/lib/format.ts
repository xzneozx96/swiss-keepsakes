/**
 * Swiss formats from the design system: money as "CHF 1’249.00", full dates as "14.10.2026".
 * Both en-CH and de-CH produce these, so the language switch does not change them.
 */
export type IntlLocale = "en-CH" | "de-CH";

export function formatMoney(amount: number, locale: IntlLocale): string {
  return (
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CHF",
      currencyDisplay: "code",
    })
      .format(amount)
      // Chrome's ICU groups Swiss numbers with "'" while Node uses "’"; the design system specifies "’".
      .replace(/'/g, "’")
  );
}

/**
 * A short calendar date (YYYY-MM-DD, a Zurich calendar day) for cards and labels, with
 * the month as a word so nobody misreads day and month (owner decision 13.10.2026):
 * EN "Wed 14 Oct", DE "Mi., 14. Okt.". The year is added when it is not the current one.
 * Orders, payments and receipts keep the full numeric date (formatDate).
 */
export function formatShortDate(
  isoDate: string,
  today: string,
  locale: IntlLocale,
): string {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const year =
    isoDate.slice(0, 4) === today.slice(0, 4) ? "" : ` ${isoDate.slice(0, 4)}`;

  // Joined by hand: browsers disagree on commas for en-CH ("Wed, 14 Oct" vs "Wed 14 Oct").
  return locale === "de-CH"
    ? `${part("weekday")}, ${part("day")}. ${part("month")}${year}`
    : `${part("weekday")} ${part("day")} ${part("month")}${year}`;
}

export function formatDate(date: Date, locale: IntlLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
