import type {
  Departure,
  Tour,
  TourBooking,
  TourData,
  TourDraft,
  TourParticipants,
} from "./types";

import { firstPaymentAmount, tourTotal } from "./lib/selectors";
import { operationsFixtures } from "./merchant/lib/fixtures";
import { pilatus, pilatusDepartures } from "./lucerne/pilatus";
import { rigi, rigiDepartures } from "./lucerne/rigi";
import {
  thingsThatRemain,
  thingsThatRemainDepartures,
} from "./lucerne/things-that-remain";

export const tourSeed: Tour[] = [thingsThatRemain, pilatus, rigi];
export function emptyTourDraft(): TourDraft {
  return {
    tourId: "things-that-remain",
    departureId: "walk-16",
    adults: 2,
    children: 1,
    infants: 0,
    contactName: "",
    phone: "",
    childName: "",
  };
}
type BookingContact = Pick<
  TourBooking,
  "id" | "ref" | "guestId" | "contactName" | "phone" | "partnerId"
>;

/** A confirmed sample booking with its first payment made, priced from the tour and departure. */
function seededBooking(
  tour: Tour,
  departure: Departure,
  contact: BookingContact,
  group: TourParticipants,
): TourBooking {
  const total = tourTotal(tour, group);
  const firstAmount = firstPaymentAmount(departure.policy, total);
  const createdAt = "2026-10-11T09:00:00+02:00";

  return {
    ...contact,
    ...group,
    language: "en",
    tourId: tour.id,
    departureId: departure.id,
    tourName: structuredClone(tour.name),
    meetingPoint: structuredClone(tour.meetingPoint),
    startsAt: departure.startsAt,
    endsAt: new Date(
      Date.parse(departure.startsAt) + tour.durationMinutes * 60_000,
    ).toISOString(),
    childName: "",
    total,
    firstAmount,
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    infantPrice: tour.infantPrice,
    cancellationPolicy: structuredClone(tour.cancellationPolicy),
    policy: departure.policy,
    balanceDueAt: departure.balanceDueAt,
    commissionRate: tour.commissionRate,
    createdAt,
    commissionRecordedAt: null,
    activity: [],
    status: "confirmed",
    holdUntil: null,
    payments:
      firstAmount > 0
        ? [
            {
              id: `${contact.id}-payment`,
              amount: firstAmount,
              method: "online",
              status: "succeeded",
              at: createdAt,
            },
          ]
        : [],
  };
}

export function createTourSeed(): TourData {
  const departures = [
    {
      id: "walk-13",
      tourId: "things-that-remain",
      startsAt: "2026-10-13T07:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-12T18:00:00+02:00",
      closed: true,
    },
    {
      id: "walk-16",
      tourId: "things-that-remain",
      startsAt: "2026-10-16T09:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-15T18:00:00+02:00",
      closed: false,
    },
    {
      id: "walk-18",
      tourId: "things-that-remain",
      startsAt: "2026-10-18T09:00:00+02:00",
      capacity: 12,
      policy: "full",
      balanceDueAt: "2026-10-18T09:00:00+02:00",
      closed: false,
    },
    {
      id: "walk-20",
      tourId: "things-that-remain",
      startsAt: "2026-10-20T09:00:00+02:00",
      capacity: 12,
      policy: "full",
      balanceDueAt: "2026-10-20T09:00:00+02:00",
      closed: false,
    },
    {
      id: "history-17",
      tourId: "pilatus-above-the-city",
      startsAt: "2026-10-17T08:30:00+02:00",
      capacity: 8,
      policy: "later",
      balanceDueAt: "2026-10-16T18:00:00+02:00",
      closed: false,
    },
    // Last seats: 9 of 12 seats are booked, so the sample group of 3 takes the last ones.
    {
      id: "walk-23",
      tourId: "things-that-remain",
      startsAt: "2026-10-23T09:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-22T18:00:00+02:00",
      closed: false,
    },
    {
      id: "quiet-17",
      tourId: "rigi-from-lake-to-sky",
      startsAt: "2026-10-17T08:45:00+02:00",
      capacity: 6,
      policy: "full",
      balanceDueAt: "2026-10-17T08:45:00+02:00",
      closed: false,
    },
    ...thingsThatRemainDepartures,
    ...pilatusDepartures,
    ...rigiDepartures,
  ] satisfies TourData["departures"];
  const tour = tourSeed[0];
  const record = {
    language: "en",
    tourId: tour.id,
    departureId: "walk-13",
    tourName: tour.name,
    meetingPoint: tour.meetingPoint,
    startsAt: "2026-10-13T07:00:00+02:00",
    endsAt: "2026-10-13T10:00:00+02:00",
    adults: 2,
    children: 1,
    infants: 0,
    childName: "Alex",
    total: 22300,
    firstAmount: 6690,
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    infantPrice: tour.infantPrice,
    cancellationPolicy: structuredClone(tour.cancellationPolicy),
    policy: "deposit",
    balanceDueAt: "2026-10-12T18:00:00+02:00",
    partnerId: null,
    commissionRate: 0.1,
    createdAt: "2026-10-12T10:00:00+02:00",
    commissionRecordedAt: null,
    activity: [],
  } satisfies Partial<TourBooking>;
  const bookings: TourBooking[] = [
    {
      ...record,
      id: "tour-anna",
      ref: "SK-T1042",
      guestId: "g-anna",
      contactName: "Anna Keller",
      phone: "+41 79 123 45 67",
      status: "confirmed",
      holdUntil: null,
      payments: [
        {
          id: "tp-1",
          amount: 6690,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
    {
      ...record,
      id: "tour-lena",
      ref: "SK-T1044",
      guestId: "g-elena",
      contactName: "Elena Novak",
      phone: "+41 78 555 01 44",
      status: "no_show",
      holdUntil: null,
      payments: [
        {
          id: "tp-2",
          amount: 22300,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
    {
      ...record,
      id: "tour-marie",
      ref: "SK-T1045",
      guestId: "g-marie",
      contactName: "Marie Dubois",
      phone: "+41 79 555 01 45",
      status: "delivered",
      holdUntil: null,
      payments: [],
    },
    {
      ...record,
      id: "tour-tom",
      ref: "SK-T1043",
      guestId: "g-tom",
      contactName: "Tom Becker",
      phone: "+49 151 555 0143",
      departureId: "walk-16",
      startsAt: "2026-10-16T09:00:00+02:00",
      endsAt: "2026-10-16T12:00:00+02:00",
      balanceDueAt: "2026-10-15T18:00:00+02:00",
      status: "confirmed",
      holdUntil: null,
      payments: [
        {
          id: "tp-3",
          amount: 6690,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
  ];
  // Seat fillers: walk-18 and quiet-17 are sold out, walk-23 keeps its last 3 seats.
  const fillers = [
    [
      "walk-18",
      {
        id: "tour-yuki",
        ref: "SK-T1046",
        guestId: "g-yuki",
        contactName: "Yuki Tanaka",
        phone: "+41 79 555 01 46",
        partnerId: null,
      },
      { adults: 2, children: 2, infants: 0 },
    ],
    [
      "walk-18",
      {
        id: "tour-sofia",
        ref: "SK-T1047",
        guestId: "g-sofia",
        contactName: "Sofia Rossi",
        phone: "+39 333 555 0147",
        partnerId: null,
      },
      { adults: 4, children: 0, infants: 0 },
    ],
    [
      "walk-18",
      {
        id: "tour-daniel",
        ref: "SK-T1048",
        guestId: "g-daniel",
        contactName: "Daniel Meier",
        phone: "+41 76 555 01 48",
        partnerId: null,
      },
      { adults: 2, children: 2, infants: 1 },
    ],
    [
      "walk-23",
      {
        id: "tour-lars",
        ref: "SK-T1049",
        guestId: "g-lars",
        contactName: "Lars Jensen",
        phone: "+45 20 55 01 49",
        partnerId: "hotel-am-see",
      },
      { adults: 3, children: 2, infants: 0 },
    ],
    [
      "walk-23",
      {
        id: "tour-peter",
        ref: "SK-T1050",
        guestId: "g-peter",
        contactName: "Peter Schmid",
        phone: "+41 79 555 01 50",
        partnerId: null,
      },
      { adults: 4, children: 0, infants: 0 },
    ],
    [
      "quiet-17",
      {
        id: "tour-marie-workshop",
        ref: "SK-T1051",
        guestId: "g-marie",
        contactName: "Marie Dubois",
        phone: "+41 79 555 01 45",
        partnerId: null,
      },
      { adults: 2, children: 1, infants: 0 },
    ],
    [
      "quiet-17",
      {
        id: "tour-elena-workshop",
        ref: "SK-T1052",
        guestId: "g-elena",
        contactName: "Elena Novak",
        phone: "+41 78 555 01 44",
        partnerId: null,
      },
      { adults: 3, children: 0, infants: 0 },
    ],
  ] satisfies [string, BookingContact, TourParticipants][];

  for (const [departureId, contact, group] of fillers) {
    const departure = departures.find((d) => d.id === departureId);
    const tour = tourSeed.find((t) => t.id === departure?.tourId);

    if (departure && tour)
      bookings.push(seededBooking(tour, departure, contact, group));
  }
  // Steps 2.10–2.14: overdue policies, completion, cancellation and reconciliation cases.
  const operations = operationsFixtures(tourSeed, departures);

  return {
    tours: structuredClone(tourSeed),
    departures: [...departures, ...operations.departures],
    bookings: [...bookings, ...operations.bookings],
    draft: emptyTourDraft(),
  };
}
