/**
 * Swiss formats from the design system: money as "CHF 1’249.00", full dates as "14.10.2026".
 * Both en-CH and de-CH produce these, so the language switch does not change them.
 */
export type IntlLocale = "en-CH" | "de-CH";

const numberFormats = new Map<string, Intl.NumberFormat>();
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();

/** Building an Intl formatter costs far more than calling one, so each locale and options pair is built once. */
export function numberFormat(
  locale: string,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = numberFormats.get(key);

  if (!format) {
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }

  return format;
}

export function dateTimeFormat(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let format = dateTimeFormats.get(key);

  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    dateTimeFormats.set(key, format);
  }

  return format;
}

/** A Zurich calendar day (YYYY-MM-DD) as a Date at noon UTC, so UTC getters and formatters never shift the day. */
export function calendarDay(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00Z`);
}

/** Short calendar parts for a date tile, read as a plain date (no time zone shift). */
export function pickupDay(isoDate: string, locale: IntlLocale) {
  const at = calendarDay(isoDate);
  const part = (options: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(locale, { ...options, timeZone: "UTC" })
      .format(at)
      .replace(/\.$/, "");

  return {
    weekday: part({ weekday: "short" }),
    day: part({ day: "numeric" }),
    month: part({ month: "short" }),
  };
}

/** `part` as a share of `whole` ("42%"); an empty `whole` reads as 0%. */
export function percentOf(
  part: number,
  whole: number,
  locale: string,
  fractionDigits = 0,
): string {
  return numberFormat(
    locale,
    fractionDigits
      ? { style: "percent", maximumFractionDigits: fractionDigits }
      : { style: "percent" },
  ).format(whole ? part / whole : 0);
}

export function formatMoney(amount: number, locale: IntlLocale): string {
  return (
    numberFormat(locale, {
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
  const date = calendarDay(isoDate);
  const parts = dateTimeFormat(locale, {
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
  return dateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
