import type { TourRecords } from '@sk/domain/bookings'
import type { ToursClient } from './client'
import type { Language } from '@/contexts/locale-context'
import type { DemoStore } from '@/features/demo/store'
import type { DemoState } from '@/features/demo/types'

import { demoNow } from '@/features/demo/clock'
import { createTourSeed } from '../seed'

const fallback = createTourSeed()

export function createToursDemoClient(store: DemoStore): ToursClient {
  // The store keeps the booking draft next to these; a change to the draft alone hands back the
  // same records, so screens that show tours do not re-render on every keystroke in it.
  let records: TourRecords | undefined

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
      const [{ changeWithMails }, { addBooking }] = await Promise.all([
        import('../booking/booking-changes'),
        import('../booking/transitions'),
      ])

      store.update(s =>
        changeWithMails(
          s,
          booking.id,
          data => addBooking(data, booking, demoNow(s.clockStartedAt)),
          language,
        ))
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
  }
}
