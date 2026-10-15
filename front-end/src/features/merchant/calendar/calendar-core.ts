import type { StatusTone } from "@/components/status-chip";

import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/monarch";

import { zurichDate } from "@/features/catalog/lib/pickup";

export const calendarPlugins = [
  themePlugin,
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
];

/** The merchant shell shows its phone chrome (bottom bar, no sidebar) below its `lg` 1024px. */
export const MOBILE_QUERY = "(max-width: 1023.98px)";

export interface ShownLabel {
  text: string;
  tone: StatusTone;
}

/** One tour departure: one event, with the seats and the lead booking. */
export interface TourItem {
  kind: "tour";
  id: string;
  departureId: string;
  title: string;
  /** Europe/Zurich local date, "HH:mm" and the FullCalendar start and end. */
  date: string;
  time: string;
  end: string;
  start: string;
  stop: string;
  booked: number;
  held: number;
  capacity: number;
  /** The first booking's contact, "" when nobody has booked. */
  lead: string;
  more: number;
  meetingPoint: string;
  phase: ShownLabel;
  payment: ShownLabel;
}

/** One keepsake order, on its pickup date. */
export interface PickupItem {
  kind: "pickup";
  id: string;
  orderId: string;
  ref: string;
  title: string;
  date: string;
  customer: string;
  quantity: number;
  place: string;
  requested: boolean;
  progress: ShownLabel;
  payment: ShownLabel;
}

export type CalendarItem = TourItem | PickupItem;

export type CalendarOverlay =
  { kind: "date" } | { kind: "event"; item: CalendarItem } | null;

export const swissDate = zurichDate;

const zurichParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Zurich",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-15T09:00:00": the wall-clock time in Zurich, which the calendar is set to show. */
export function zurichLocal(at: Date): string {
  const part = Object.fromEntries(
    zurichParts.formatToParts(at).map((p) => [p.type, p.value]),
  );

  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}:00`;
}
