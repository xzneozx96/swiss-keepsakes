import type { MessageKey } from "@/i18n/en";
import type { Departure, Tour, TourParticipants } from "@/features/tours/types";
import type { CalendarDate } from "@internationalized/date";

import { parseDate } from "@internationalized/date";
import { useMemo, useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useTours } from "@/features/tours/hooks/use-tours";
import {
  availableSeats,
  participantSeats,
  upcomingDepartures,
} from "@/features/tours/lib/selectors";
import { formatShortDate } from "@/lib/format";

/** At or below this many free seats a day or slot reads as "few left". */
export const LOW_SEATS = 2;

const zurichTime = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Europe/Zurich",
});

/** One departure as the picker shows it. */
export interface Slot {
  id: string;
  /** Zurich calendar day, YYYY-MM-DD. */
  day: string;
  /** Zurich wall-clock start and end, HH:mm. */
  time: string;
  end: string;
  seats: number;
  policy: Departure["policy"];
}

export type DayState = "open" | "low" | "soldout";

export interface DaySlots {
  day: string;
  date: CalendarDate;
  slots: Slot[];
  /** Most seats free in any one slot of the day. */
  seats: number;
  state: DayState;
}

/** The tour's upcoming departures by Zurich day, with free seats, on the demo clock. */
export function useSlotModel(tour: Tour) {
  const { data, now } = useTours();
  const todayIso = zurichDate(now);
  // Stable identities: React Aria memoizes against min/max value objects.
  const today = useMemo(() => parseDate(todayIso), [todayIso]);
  const minute = Math.floor(now.getTime() / 60_000);

  const model = useMemo(() => {
    const at = new Date(minute * 60_000);
    const slots: Slot[] = upcomingDepartures(data, tour.id, at).map((d) => {
      const start = new Date(d.startsAt);

      return {
        id: d.id,
        day: zurichDate(start),
        time: zurichTime.format(start),
        end: zurichTime.format(
          new Date(start.getTime() + tour.durationMinutes * 60_000),
        ),
        seats: availableSeats(data, d.id, at),
        policy: d.policy,
      };
    });
    const byDay = new Map<string, DaySlots>();

    for (const slot of slots) {
      const entry = byDay.get(slot.day) ?? {
        day: slot.day,
        date: parseDate(slot.day),
        slots: [],
        seats: 0,
        state: "soldout" as DayState,
      };

      entry.slots.push(slot);
      entry.seats = Math.max(entry.seats, slot.seats);
      entry.state =
        entry.seats === 0
          ? "soldout"
          : entry.seats <= LOW_SEATS
            ? "low"
            : "open";
      byDay.set(slot.day, entry);
    }
    const days = [...byDay.values()];

    return {
      slots,
      byDay,
      days,
      bookable: days.filter((d) => d.state !== "soldout"),
      firstDay: days[0]?.date,
      lastDay: days[days.length - 1]?.date,
    };
  }, [data, tour.id, minute, tour.durationMinutes]);

  return { tour, today, ...model };
}

export type SlotModel = ReturnType<typeof useSlotModel>;

export function firstFitting(day: DaySlots | undefined, used: number) {
  return day?.slots.find((s) => s.seats >= Math.max(1, used));
}

/** Where the choice keeps its group and departure: the booking draft. */
export interface SlotStore {
  group: TourParticipants;
  slotId: string;
  setSlotId: (id: string) => void;
}

/**
 * One departure: a day on the grid, then one of its start times. A day with a single
 * departure takes it whenever it has a seat, so the guest sees what is chosen; a day with
 * several takes the first that fits the group.
 */
export function useSlotChoice(
  model: SlotModel,
  f: PickerFormat,
  store: SlotStore,
) {
  const { group, slotId, setSlotId } = store;
  const used = participantSeats(group);
  const slot = model.slots.find((s) => s.id === slotId);
  const [dayState, setDayState] = useState<CalendarDate | null>(() =>
    slot ? parseDate(slot.day) : null,
  );
  // A departure chosen elsewhere (the draft) brings its day along.
  const day =
    slot && dayState?.toString() !== slot.day ? parseDate(slot.day) : dayState;
  const dayInfo = day ? model.byDay.get(day.toString()) : undefined;
  const [announcement, setAnnouncement] = useState("");

  const announce = (next: Slot | undefined, date: CalendarDate) =>
    setAnnouncement(
      next
        ? f.t("announce", {
            date: f.fullDate(date),
            time: `${next.time}–${next.end}`,
            seats: f.seatsLeft(next.seats),
          })
        : f.t("noTime"),
    );
  const setDay = (date: CalendarDate) => {
    const info = model.byDay.get(date.toString());
    const only = info?.slots.length === 1 ? info.slots[0] : undefined;
    const next = firstFitting(info, used) ?? (only?.seats ? only : undefined);

    setDayState(date);
    setSlotId(next?.id ?? "");
    announce(next, date);
  };
  const pick = (id: string) => {
    const next = model.slots.find((s) => s.id === id);

    if (next) {
      setDayState(parseDate(next.day));
      announce(next, parseDate(next.day));
    }
    setSlotId(id);
  };
  /** The next slot after this day where the whole group fits. */
  const nextFit = dayInfo
    ? model.slots.find(
        (s) => s.day > dayInfo.day && s.seats >= Math.max(1, used),
      )
    : undefined;

  return {
    group,
    used,
    day,
    dayInfo,
    setDay,
    slot,
    slotId,
    setSlotId: pick,
    nextFit,
    announcement,
  };
}

export type SlotChoice = ReturnType<typeof useSlotChoice>;

type PickerKey = MessageKey extends infer K
  ? K extends `tourDiscovery.picker.${infer Rest}`
    ? Rest
    : never
  : never;

/** Formatting for the current language; dates are Zurich calendar days. */
export function usePickerFormat(today: CalendarDate) {
  const { t: translate, intlLocale: locale } = useLocale();
  const t = (key: PickerKey, vars?: Record<string, string | number>) =>
    translate(`tourDiscovery.picker.${key}` as MessageKey, vars);
  const full = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const plural = (count: number) =>
    new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";

  return {
    t,
    day: (d: CalendarDate) =>
      formatShortDate(d.toString(), today.toString(), locale),
    fullDate: (d: CalendarDate) =>
      full.format(new Date(Date.UTC(d.year, d.month - 1, d.day))),
    /** "3 seats available" or "Sold out", as a tour counts seats. */
    seatsLeft: (n: number) =>
      n === 0
        ? translate("tourDiscovery.soldOut")
        : translate(`tourDiscovery.available.${plural(n)}`, { count: n }),
  };
}

export type PickerFormat = ReturnType<typeof usePickerFormat>;
