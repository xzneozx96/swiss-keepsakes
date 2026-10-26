// Moved out of tests/failed-command.test.tsx with the booking screens (E3.1, ADR-012). Named without ".test" so Vitest does not pick it up; rename it when the screens return.
import type { ReactNode } from 'react'
import type { DataClient } from '@/features/data-client'
import type { DemoState } from '@/features/demo/types'

import { availableSeats, bookingAmountDue } from '@sk/domain/bookings'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { createDemoDataClient } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { createDemoStore } from '@/features/demo/store'
import { TourReviewPage } from '@/features/tours/booking/tour-review-page'
import { useTourPayment } from '@/features/tours/booking/use-tour-payment'

const navigate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', async importOriginal => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}))

beforeEach(() => {
  window.localStorage.clear()
  navigate.mockClear()
})

/**
 * The demo client with one command that fails once `fail` is called, as an API call that is
 * refused after a while.
 */
function failingSetup(
  state: DemoState,
  failing: (demo: DataClient, held: Promise<never>) => DataClient,
) {
  const store = createDemoStore(state)
  let fail = () => {}
  const held = new Promise<never>((_, reject) => {
    fail = () => reject(new Error('The API is down'))
  })

  // Settles nothing until the test calls `fail`; the catch only keeps Vitest from reporting it.
  held.catch(() => {})
  const client = failing(createDemoDataClient(store), held)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <DataClientProvider client={client}>
        <LocaleProvider>
          <DemoProvider store={store}>
            <Suspense fallback={null}>{children}</Suspense>
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>
  )

  return { store, fail, wrapper }
}

describe('a command that fails frees its button', () => {
  it('[E1.11] C11: a booking that could not be sent says so and may be sent again', async () => {
    const state = createSeedState()
    const tours = state.data.tours!
    const now = demoNow(state.clockStartedAt)
    const departure = tours.departures.find(
      d =>
        !d.closed
        && Date.parse(d.startsAt) > now.getTime() + 86_400_000
        && availableSeats(tours, d.id, now) >= 1
        && tours.tours.find(t => t.id === d.tourId)?.published,
    )!
    const tour = tours.tours.find(t => t.id === departure.tourId)!

    state.data = {
      ...state.data,
      signedInGuestId: 'g-test',
      tours: {
        ...tours,
        draft: {
          ...tours.draft,
          tourId: tour.id,
          departureId: departure.id,
          adults: 1,
          children: 0,
          infants: 0,
          contactName: 'Test Guest',
          phone: '+41 79 123 45 67',
          participantAnswers: Object.fromEntries(
            tour.participantFields.map(field => [field.id, 'Test']),
          ),
        },
      },
    }
    const { store, fail, wrapper } = failingSetup(state, (demo, held) => ({
      ...demo,
      tours: { ...demo.tours, createBooking: () => held },
    }))
    const root = createRootRoute({ component: Outlet })
    const review = createRoute({
      getParentRoute: () => root,
      path: '/review',
      component: () => <TourReviewPage slug={tour.slug} />,
    })
    const router = createRouter({
      routeTree: root.addChildren([review]),
      history: createMemoryHistory({ initialEntries: ['/review'] }),
    })

    render(<RouterProvider router={router} />, { wrapper })
    const submit = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      )

      expect(button).not.toBeNull()

      return button!
    })

    await userEvent.click(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    fail()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your booking could not be created.',
    )
    expect(submit).not.toBeDisabled()
    expect(navigate).not.toHaveBeenCalled()
    expect(store.getState().data.tours!.bookings).toBe(tours.bookings)
  })

  it('[E1.11] tour payment: a payment that could not be sent frees Pay', async () => {
    const state = createSeedState()
    const now = demoNow(state.clockStartedAt)
    const booking = state.data.tours!.bookings.find(
      b =>
        bookingAmountDue(b) > 0
        && (b.status === 'confirmed'
          || (b.status === 'pending_payment'
            && Date.parse(b.holdUntil) > now.getTime() + 3_600_000))
          && !b.payments.some(p => p.status === 'processing'),
    )!

    state.data = { ...state.data, signedInGuestId: booking.guestId }
    const { fail, wrapper } = failingSetup(state, (demo, held) => ({
      ...demo,
      tours: { ...demo.tours, pay: () => held },
    }))
    const { result } = renderHook(() => useTourPayment(booking, now), {
      wrapper,
    })

    await waitFor(() => expect(result.current).not.toBeNull())
    act(() => result.current.choose('succeeded'))
    expect(result.current.isPending).toBe(true)
    fail()

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(navigate).not.toHaveBeenCalled()
  })
})
