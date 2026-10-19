import { PLACES, RESTAURANTS, type Place } from "../data/places";

import { dateTimeFormat, calendarDay } from "@/lib/format";

export const WINDOW_FROM = "2026-10-17";
export const WINDOW_TO = "2027-03-31";

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);

  return h * 60 + m;
};

export const fmt = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Day of week for an ISO date, 0 = Sunday. */
export const dow = (iso: string) => calendarDay(iso).getUTCDay();

const between = (iso: string, from: string, to: string) =>
  iso >= from && iso <= to;

export const dayLabel = (iso: string) =>
  dateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(calendarDay(iso));

export const shortDay = (iso: string) =>
  dateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(calendarDay(iso));

/** Earliest and latest minute a visit can start, or why the place is closed that day. */
export type Hours = { open: number; last: number } | { closed: string };

const m = (h: number, min = 0) => h * 60 + min;
const span = (open: number, close: number, stay: number): Hours => ({
  open,
  last: close - stay,
});

const sundaySalesClosed = (iso: string) =>
  ["2026-11-01", "2026-12-25", "2026-12-26", "2027-01-01"].includes(iso);

/** Opening rules per place, taken from each operator's published hours (research of 16 Oct 2026). */
export function hoursFor(id: string, iso: string): Hours {
  const day = dow(iso);

  switch (id) {
    case "chapel":
    case "weinmarkt":
    case "spreuer":
    case "nadelwehr":
    case "lion":
      return { open: 0, last: m(23) };
    case "zytturm":
      return iso <= "2026-11-01"
        ? span(m(8), m(19), 30)
        : { closed: "closed for the winter, 2 Nov to 31 Mar" };
    case "glacier":
      return iso <= "2026-10-31"
        ? span(m(10), m(18), 60)
        : span(m(10), m(17), 60);
    case "bourbaki":
      return iso <= "2026-10-31"
        ? span(m(10), m(18), 45)
        : span(m(10), m(17), 45);
    case "verkehrshaus":
      return span(m(10), m(17), 150);
    case "rosengart": {
      if (iso === "2026-12-25") return { closed: "closed on 25 Dec" };
      if (iso <= "2026-10-31") return span(m(10), m(18), 90);
      if (iso <= "2026-12-31") return span(m(11), m(17), 90);
      if (iso <= "2027-03-25") {
        if (day === 1) return { closed: "closed on Mondays until 22 Mar" };
        if (between(iso, "2027-02-04", "2027-02-09"))
          return { closed: "closed during Fasnacht, 4 to 9 Feb" };

        return span(m(12), m(17), 90);
      }

      return span(m(10), m(18), 90);
    }
    case "kunstmuseum": {
      if (iso > "2026-12-31")
        return { closed: "2027 opening hours are not published yet" };
      if (day === 1) return { closed: "closed on Mondays" };
      if (
        ["2026-12-08", "2026-12-24", "2026-12-25", "2026-12-31"].includes(iso)
      )
        return { closed: "closed on this date" };

      return day === 3 ? span(m(11), m(19), 75) : span(m(11), m(18), 75);
    }
    case "cruise": {
      const late =
        day === 5 ||
        day === 6 ||
        between(iso, "2026-12-24", "2027-01-02") ||
        between(iso, "2027-03-26", "2027-03-28");

      return { open: m(9, 7), last: late ? m(22, 7) : m(19, 7) };
    }
    case "pilatus":
      return between(iso, "2026-12-01", "2026-12-31")
        ? { open: m(8, 30), last: m(12, 30) }
        : {
            closed:
              iso <= "2026-11-30"
                ? "the Dragon Ride is closed for maintenance until 27 Nov"
                : "the 2027 timetable is not published yet",
          };
    case "sprungli": {
      if (sundaySalesClosed(iso)) return { closed: "closed on this holiday" };
      if (iso === "2026-10-31") return span(m(9), m(17), 30);
      if (iso === "2026-12-24" || iso === "2026-12-31")
        return span(m(9), m(17), 30);
      if (day === 0) return span(m(11), m(18), 30);
      if (day === 6) return span(m(9), m(18), 30);

      return span(m(9), m(19), 30);
    }
    case "laederach":
      if (day === 0) return span(m(10), m(20), 20);
      if (day === 6) return span(m(8), m(20), 20);

      return span(m(8), m(21), 20);
    case "bucherer":
      if (day === 0) return { closed: "Sunday hours are not confirmed" };
      if (sundaySalesClosed(iso)) return { closed: "closed on this holiday" };

      return { open: m(9), last: m(16, 30) };
    default:
      return { closed: "unknown place" };
  }
}

export const isOpen = (id: string, iso: string) =>
  !("closed" in hoursFor(id, iso));

export function closedPlaces(iso: string) {
  return PLACES.flatMap((p: Place) => {
    const h = hoursFor(p.id, iso);

    return "closed" in h ? [{ id: p.id, name: p.name, reason: h.closed }] : [];
  });
}

export const restaurantOpen = (id: string, iso: string) => {
  const r = RESTAURANTS.find((x) => x.id === id);

  return !!r && !r.closedOn.includes(dow(iso));
};
