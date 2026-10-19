import type {
  Departure,
  Tour,
  TourBooking,
  TourParticipants,
} from '../../types'

/**
 * Merchant-operation fixtures (steps 2.10–2.14), relative to the demo start 13.10.2026 10:00.
 * Sample policies, not approved merchant settings:
 * - walk-14: cancel-and-release after the balance deadline (today 18:00); tour tomorrow (N13).
 * - history-15: pay later with a 48-hour grace period, already overdue, then the merchant decides.
 * - history-11: ended; a fully paid, delivered Hotel am See booking for Anna to complete (review, P02).
 * - walk-19: cancelled by the merchant (seeded state; cancellation operations are Phase 3).
 * - walk-16 (seeded by step 2.1): an expired hold whose payment arrived late (reconciliation).
 */
export function operationsFixtures(
  tours: Tour[],
  seeded: Departure[],
): {
  departures: Departure[]
  bookings: TourBooking[]
} {
  const departures: Departure[] = [
    {
      id: 'walk-14',
      tourId: 'things-that-remain',
      startsAt: '2026-10-14T09:00:00+02:00',
      capacity: 12,
      policy: 'deposit',
      balanceDueAt: '2026-10-13T18:00:00+02:00',
      closed: false,
      overduePolicy: { action: 'cancel' },
    },
    {
      id: 'history-15',
      tourId: 'pilatus-above-the-city',
      startsAt: '2026-10-15T08:30:00+02:00',
      capacity: 8,
      policy: 'later',
      balanceDueAt: '2026-10-12T18:00:00+02:00',
      closed: false,
      overduePolicy: { action: 'grace', graceHours: 48 },
    },
    {
      id: 'history-11',
      tourId: 'pilatus-above-the-city',
      startsAt: '2026-10-11T08:30:00+02:00',
      capacity: 8,
      policy: 'full',
      balanceDueAt: '2026-10-11T08:30:00+02:00',
      closed: true,
    },
    {
      id: 'walk-19',
      tourId: 'things-that-remain',
      startsAt: '2026-10-19T09:00:00+02:00',
      capacity: 12,
      policy: 'full',
      balanceDueAt: '2026-10-19T09:00:00+02:00',
      closed: true,
      cancelledAt: '2026-10-12T16:00:00+02:00',
    },
  ]
  const all = [...departures, ...seeded]

  function booking(
    departureId: string,
    contact: Pick<
      TourBooking,
      'id' | 'ref' | 'guestId' | 'contactName' | 'phone' | 'language'
    > & { partnerId?: string, createdAt: string },
    group: TourParticipants,
    state: Pick<TourBooking, 'payments' | 'activity' | 'lateResults'> & {
      status: Exclude<TourBooking['status'], 'pending_payment'>
    },
  ): TourBooking {
    const departure = all.find(d => d.id === departureId)!
    const tour = tours.find(t => t.id === departure.tourId)!
    const total
      = tour.adultPrice * group.adults
        + tour.childPrice * group.children
        + tour.infantPrice * group.infants

    return {
      ...contact,
      ...group,
      ...state,
      partnerId: contact.partnerId ?? null,
      tourId: tour.id,
      departureId,
      tourName: structuredClone(tour.name),
      meetingPoint: structuredClone(tour.meetingPoint),
      startsAt: departure.startsAt,
      endsAt: new Date(
        Date.parse(departure.startsAt) + tour.durationMinutes * 60_000,
      ).toISOString(),
      childName: '',
      total,
      firstAmount:
        departure.policy === 'deposit'
          ? Math.round(total * 0.3)
          : departure.policy === 'full'
            ? total
            : 0,
      adultPrice: tour.adultPrice,
      childPrice: tour.childPrice,
      infantPrice: tour.infantPrice,
      cancellationPolicy: structuredClone(tour.cancellationPolicy),
      policy: departure.policy,
      balanceDueAt: departure.balanceDueAt,
      overduePolicy: departure.overduePolicy,
      commissionRate: tour.commissionRate,
      commissionRecordedAt: null,
      holdUntil: null,
    }
  }
  const created = (at: string) => ({ at, event: 'created', actor: 'guest' })
  const paid = (at: string, actor = 'guest') => ({
    at,
    event: 'payment-succeeded',
    actor,
  })

  const bookings: TourBooking[] = [
    booking(
      'walk-14',
      {
        id: 'tc-anna-overdue',
        ref: 'SK-T2001',
        guestId: 'g-anna',
        contactName: 'Anna Keller',
        phone: '+41 79 123 45 67',
        language: 'en',
        createdAt: '2026-10-09T15:00:00+02:00',
      },
      { adults: 2, children: 1, infants: 0 },
      {
        status: 'confirmed',
        payments: [
          {
            id: 'tp-2001',
            amount: 6690,
            method: 'online',
            status: 'succeeded',
            at: '2026-10-09T15:04:00+02:00',
          },
        ],
        activity: [
          created('2026-10-09T15:00:00+02:00'),
          paid('2026-10-09T15:04:00+02:00'),
        ],
      },
    ),
    booking(
      'walk-14',
      {
        id: 'tc-yuki-paid',
        ref: 'SK-T2002',
        guestId: 'g-yuki',
        contactName: 'Yuki Tanaka',
        phone: '+41 79 555 01 46',
        language: 'en',
        createdAt: '2026-10-08T11:00:00+02:00',
      },
      { adults: 2, children: 0, infants: 0 },
      {
        status: 'confirmed',
        payments: [
          {
            id: 'tp-2002a',
            amount: 5340,
            method: 'online',
            status: 'succeeded',
            at: '2026-10-08T11:03:00+02:00',
          },
          {
            id: 'tp-2002b',
            amount: 12460,
            method: 'bank-transfer',
            status: 'succeeded',
            at: '2026-10-12T09:30:00+02:00',
            recordedBy: 'manager',
            note: 'Bank transfer, ref. YT-1012',
          },
        ],
        activity: [
          created('2026-10-08T11:00:00+02:00'),
          paid('2026-10-08T11:03:00+02:00'),
          paid('2026-10-12T09:35:00+02:00', 'manager'),
        ],
      },
    ),
    booking(
      'history-15',
      {
        id: 'tc-daniel-grace',
        ref: 'SK-T2003',
        guestId: 'g-daniel',
        contactName: 'Daniel Meier',
        phone: '+41 76 555 01 48',
        language: 'de',
        createdAt: '2026-10-05T19:00:00+02:00',
      },
      { adults: 2, children: 0, infants: 0 },
      {
        status: 'confirmed',
        payments: [],
        activity: [created('2026-10-05T19:00:00+02:00')],
      },
    ),
    booking(
      'history-11',
      {
        id: 'tc-anna-done',
        ref: 'SK-T2004',
        guestId: 'g-anna',
        contactName: 'Anna Keller',
        phone: '+41 79 123 45 67',
        language: 'en',
        partnerId: 'hotel-am-see',
        createdAt: '2026-10-05T10:00:00+02:00',
      },
      { adults: 2, children: 1, infants: 0 },
      {
        status: 'delivered',
        payments: [
          {
            id: 'tp-2004',
            amount: 32300,
            method: 'online',
            status: 'succeeded',
            at: '2026-10-05T10:05:00+02:00',
          },
        ],
        activity: [
          created('2026-10-05T10:00:00+02:00'),
          paid('2026-10-05T10:05:00+02:00'),
          {
            at: '2026-10-11T13:30:00+02:00',
            event: 'delivered',
            actor: 'manager',
          },
        ],
      },
    ),
    booking(
      'walk-19',
      {
        id: 'tc-sofia-cancelled',
        ref: 'SK-T2005',
        guestId: 'g-sofia',
        contactName: 'Sofia Rossi',
        phone: '+39 333 555 0147',
        language: 'en',
        createdAt: '2026-10-07T12:00:00+02:00',
      },
      { adults: 2, children: 0, infants: 0 },
      {
        status: 'cancelled',
        payments: [
          {
            id: 'tp-2005',
            amount: 17800,
            method: 'online',
            status: 'succeeded',
            at: '2026-10-07T12:03:00+02:00',
          },
        ],
        activity: [
          created('2026-10-07T12:00:00+02:00'),
          paid('2026-10-07T12:03:00+02:00'),
          {
            at: '2026-10-12T16:00:00+02:00',
            event: 'departure-cancelled',
            actor: 'owner',
          },
        ],
      },
    ),
    booking(
      'walk-16',
      {
        id: 'tc-lars-late',
        ref: 'SK-T2006',
        guestId: 'g-lars',
        contactName: 'Lars Jensen',
        phone: '+45 20 55 01 49',
        language: 'en',
        createdAt: '2026-10-13T09:20:00+02:00',
      },
      { adults: 2, children: 0, infants: 0 },
      {
        status: 'expired',
        // Paid at 09:33 inside the hold; the provider's result arrived after expiry.
        payments: [
          {
            id: 'tp-2006',
            amount: 5340,
            method: 'online',
            status: 'succeeded',
            at: '2026-10-13T09:33:00+02:00',
          },
        ],
        activity: [
          created('2026-10-13T09:20:00+02:00'),
          {
            at: '2026-10-13T09:35:00+02:00',
            event: 'expired',
            actor: 'system',
          },
          {
            at: '2026-10-13T09:35:00+02:00',
            event: 'session-closed',
            actor: 'system',
          },
          {
            at: '2026-10-13T09:41:00+02:00',
            event: 'payment-late-succeeded',
            actor: 'provider',
          },
        ],
        lateResults: [
          {
            paymentId: 'tp-2006',
            paidAt: '2026-10-13T09:33:00+02:00',
            receivedAt: '2026-10-13T09:41:00+02:00',
          },
        ],
      },
    ),
  ]

  return { departures, bookings }
}
