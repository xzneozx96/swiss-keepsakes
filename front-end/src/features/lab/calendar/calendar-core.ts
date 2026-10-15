import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/monarch";

import { calendarItems, type CalendarItem } from "./data";

export const calendarPlugins = [
  themePlugin,
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
];
export const sampleToday = "2026-10-15";
export const schedule = calendarItems.filter(
  (item) => item.status !== "Cancelled",
);
export type CalendarOverlay =
  { kind: "date" } | { kind: "event"; item: CalendarItem } | null;

export function swissDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
