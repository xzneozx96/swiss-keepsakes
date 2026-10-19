import type { TourData, TourRecords } from '@sk/domain/bookings'
import type { ToursClient } from './client'
import type { Language } from '@/contexts/locale-context'
import type { DemoStore } from '@/features/demo/store'
import type { DemoState } from '@/features/demo/types'

import { demoNow } from '@/features/demo/clock'
import { updateWithinBudget } from '@/features/demo/store'
import { createTourSeed } from '../seed'

const fallback = createTourSeed()

export function createToursDemoClient(store: DemoStore): ToursClient {
  // The store keeps the booking draft next to these; a change to the draft alone hands back the
  // same records, so screens that show tours do not re-render on every keystroke in it.
  let records: TourRecords | undefined

  const change = (recipe: (data: TourData, s: DemoState) => TourData) =>
    store.update(s => ({
      ...s,
      data: { ...s.data, tours: recipe(s.data.tours ?? createTourSeed(), s) },
    }))
  const staffContext = (s: DemoState, language: Language) => ({
    now: demoNow(s.clockStartedAt),
    role: s.role,
    language,
  })

  return {
    records: async () => {
      const { tours, departures, bookings }
        = store.getState().data.tours ?? fallback

      if (
        records?.tours !== tours
        || records.departures !== departures
        || records.bookings !== bookings
      ) {
        records = { tours, departures, bookings }
      }

      return records
    },
    createBooking: async ({ booking, language }) => {
      const [{ changeWithMails }, { activeHold, addBooking }] = await Promise.all([
        import('../booking/booking-changes'),
        import('../booking/transitions'),
      ])

      store.update((s) => {
        const now = demoNow(s.clockStartedAt)

        // Checked again on the latest data: a hold the guest already has on this departure, or
        // seats that went meanwhile, add nothing.
        if (activeHold(s.data.tours ?? fallback, booking.guestId, booking.departureId, now))
          return s

        return changeWithMails(
          s,
          booking.id,
          data => addBooking(data, booking, now),
          language,
        )
      })

      return !!store.getState().data.tours?.bookings.some(b => b.id === booking.id)
    },
    pay: async ({ id, outcome, language }) => {
      const { changeWithMails, startPayment } = await import(
        '../booking/booking-changes',
      )

      store.update(s =>
        changeWithMails(
          s,
          id,
          data => ({
            ...data,
            bookings: data.bookings.map(b =>
              b.id === id
                ? startPayment(
                    b,
                    outcome,
                    demoNow(s.clockStartedAt).toISOString(),
                  )
                : b,
            ),
          }),
          language,
        ))
    },
    recordPayment: async ({ id, payment, language }) => {
      const { recordExternalPayment } = await import(
        '../merchant/lib/transitions',
      )

      store.update(s =>
        recordExternalPayment(s, id, payment, staffContext(s, language)))
    },
    recordOutcome: async ({ id, result, language }) => {
      const { recordOutcome } = await import('../merchant/lib/transitions')

      store.update(s => recordOutcome(s, id, result, staffContext(s, language)))
    },
    saveTour: async (tour) => {
      updateWithinBudget(store, (s) => {
        const data = s.data.tours ?? createTourSeed()

        return {
          ...s,
          data: {
            ...s.data,
            tours: {
              ...data,
              tours: data.tours.some(item => item.id === tour.id)
                ? data.tours.map(item => (item.id === tour.id ? tour : item))
                : [...data.tours, tour],
            },
          },
        }
      })
    },
    setTourArchived: async ({ id, archived }) => {
      change((data, s) => {
        const at = archived
          ? demoNow(s.clockStartedAt).toISOString()
          : undefined

        return {
          ...data,
          tours: data.tours.map(t =>
            t.id === id ? { ...t, archivedAt: at, published: false } : t,
          ),
        }
      })
    },
    addDeparture: async (departure) => {
      change(data => ({
        ...data,
        departures: [...data.departures, departure],
      }))
    },
    setDepartureCapacity: async ({ id, capacity }) => {
      change(data => ({
        ...data,
        departures: data.departures.map(d =>
          d.id === id ? { ...d, capacity } : d,
        ),
      }))
    },
  }
}
