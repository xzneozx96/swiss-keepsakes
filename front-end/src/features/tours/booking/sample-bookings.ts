import type { Language } from "@/contexts/locale-context";
import type { TourBooking, TourData } from "../types";

import { newBooking } from "./transitions";

const PREFIX = "tb-demo-";
const at = (iso: string) => new Date(iso).toISOString();

/**
 * Prototype only (C14/C16 review): the signed-in guest's tour bookings in the states the flow
 * cannot reach without the merchant steps. Past states sit on the closed 13 Oct walk with one
 * seat each, so future capacity is untouched; the held one is a real 15-minute hold on 20 Oct.
 * Running it again replaces the earlier samples.
 */
export function addSampleTourBookings(
  data: TourData,
  guestId: string,
  contact: { name: string; phone: string },
  language: Language,
  now: Date,
): TourData {
  const tour = data.tours.find((item) => item.id === "things-that-remain");
  const past = data.departures.find((item) => item.id === "walk-13");
  const future = data.departures.find((item) => item.id === "walk-20");

  if (!tour || !past || !future) return data;
  const created = new Date("2026-10-12T10:00:00+02:00");
  const base = (
    id: string,
    departure: typeof past,
    when: Date = created,
  ): TourBooking =>
    newBooking({
      id: `${PREFIX}${id}`,
      tour,
      departure,
      draft: {
        adults: 1,
        children: 0,
        infants: 0,
        contactName: contact.name,
        phone: contact.phone,
        childName: "",
      },
      guestId,
      partnerId: null,
      language,
      now: when,
    });
  const ref = (id: string) => `SK-T9${id}`;
  const online = (
    id: string,
    amount: number,
    status: "succeeded" | "failed",
    paidAt: string,
  ) => ({
    id: `${PREFIX}pay-${id}`,
    amount,
    method: "online" as const,
    status,
    at: at(paidAt),
  });
  const events = (...list: [string, string, string][]) =>
    list.map(([when, event, actor]) => ({ at: at(when), event, actor }));
  const held = base("held", future, now);
  const samples: TourBooking[] = [
    { ...held, ref: ref("01") },
    {
      ...base("expired", past),
      ref: ref("02"),
      status: "expired",
      holdUntil: null,
      payments: [
        online("expired", 2670, "failed", "2026-10-12T10:05:00+02:00"),
      ],
      activity: events(
        ["2026-10-12T10:00:00+02:00", "created", "guest"],
        ["2026-10-12T10:05:00+02:00", "payment-failed", "guest"],
        ["2026-10-12T10:15:00+02:00", "expired", "system"],
      ),
    },
    {
      ...base("late", past),
      ref: ref("03"),
      status: "expired",
      holdUntil: null,
      payments: [
        online("late", 2670, "succeeded", "2026-10-12T10:14:00+02:00"),
      ],
      lateResults: [
        {
          paymentId: `${PREFIX}pay-late`,
          paidAt: at("2026-10-12T10:14:00+02:00"),
          receivedAt: at("2026-10-12T10:22:00+02:00"),
        },
      ],
      activity: events(
        ["2026-10-12T10:00:00+02:00", "created", "guest"],
        ["2026-10-12T10:13:00+02:00", "payment-processing", "guest"],
        ["2026-10-12T10:15:00+02:00", "expired", "system"],
        ["2026-10-12T10:15:00+02:00", "session-closed", "system"],
        ["2026-10-12T10:22:00+02:00", "payment-late-succeeded", "provider"],
      ),
    },
    {
      ...base("delivered", past),
      ref: ref("04"),
      status: "delivered",
      holdUntil: null,
      payments: [
        online("delivered", 2670, "succeeded", "2026-10-12T10:03:00+02:00"),
      ],
      activity: events(
        ["2026-10-12T10:00:00+02:00", "created", "guest"],
        ["2026-10-12T10:03:00+02:00", "payment-succeeded", "guest"],
        ["2026-10-13T09:30:00+02:00", "delivered", "manager"],
      ),
    },
    {
      ...base("completed", past),
      ref: ref("05"),
      status: "completed",
      holdUntil: null,
      commissionRecordedAt: at("2026-10-13T09:40:00+02:00"),
      payments: [
        online("completed-1", 2670, "succeeded", "2026-10-12T10:03:00+02:00"),
        online("completed-2", 6230, "succeeded", "2026-10-12T18:00:00+02:00"),
      ],
      activity: events(
        ["2026-10-12T10:00:00+02:00", "created", "guest"],
        ["2026-10-12T10:03:00+02:00", "payment-succeeded", "guest"],
        ["2026-10-12T18:00:00+02:00", "payment-succeeded", "guest"],
        ["2026-10-13T09:30:00+02:00", "delivered", "manager"],
        ["2026-10-13T09:40:00+02:00", "completed", "manager"],
      ),
    },
    {
      ...base("no-show", past),
      ref: ref("06"),
      status: "no_show",
      holdUntil: null,
      payments: [
        online("no-show", 8900, "succeeded", "2026-10-12T10:03:00+02:00"),
      ],
      activity: events(
        ["2026-10-12T10:00:00+02:00", "created", "guest"],
        ["2026-10-12T10:03:00+02:00", "payment-succeeded", "guest"],
        ["2026-10-13T09:30:00+02:00", "no_show", "owner"],
      ),
    },
  ];

  return {
    ...data,
    bookings: [
      ...data.bookings.filter((b) => !b.id.startsWith(PREFIX)),
      ...samples,
    ],
  };
}
