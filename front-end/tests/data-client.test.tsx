import type { DemoStore } from '@/features/demo/store'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Suspense } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { useMerchantComments } from '@/features/content/merchant/hooks/use-merchant-comments'
import {
  DataClientProvider,
  queryKeys,
  StorageFullError,
} from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { createDemoDataClient, startDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { createDemoStore, updateCollection } from '@/features/demo/store'
import { newBooking } from '@/features/tours/booking/transitions'

beforeEach(() => {
  window.localStorage.clear()
})

describe('demo data client', () => {
  it('[E1.11] reads every collection into the cache before the first render, as the store holds it', async () => {
    const demo = startDemo()

    await demo.ready

    const { data } = demo.store.getState()

    expect(demo.queryClient.getQueryData(queryKeys.content.articles)).toBe(
      data.articles,
    )
    expect(demo.queryClient.getQueryData(queryKeys.content.comments)).toBe(
      data.comments,
    )
  })

  it('[E1.11] every shop collection is in the cache at start, the same objects the store holds', async () => {
    const demo = startDemo()

    await demo.ready

    const { data } = demo.store.getState()
    const read = (key: readonly unknown[]) => demo.queryClient.getQueryData(key)

    expect(read(queryKeys.account.guests)).toBe(data.guests)
    expect(read(queryKeys.catalog.products)).toBe(data.products)
    expect(read(queryKeys.catalog.subcategories)).toBe(data.subcategories)
    expect(read(queryKeys.catalog.pickupPlaces)).toBe(data.pickupPlaces)
    expect(read(queryKeys.notifications.mail)).toBe(data.mail)
    expect(read(queryKeys.orders.orders)).toBe(data.orders)
    expect(read(queryKeys.partners.partners)).toBe(data.partners)
    expect(read(queryKeys.partners.referralVisits)).toBe(data.referralVisits)
    expect(read(queryKeys.partners.commissionAdjustments)).toBe(
      data.commissionAdjustments,
    )
    expect(read(queryKeys.partners.partnerPayouts)).toBe(data.partnerPayouts)
    expect(read(queryKeys.reports.costs)).toBe(data.costs)
    expect(read(queryKeys.requests.adviceQuestions)).toBe(data.adviceQuestions)
    expect(read(queryKeys.requests.adviceRequests)).toBe(data.adviceRequests)
    expect(read(queryKeys.requests.privateTourRequests)).toBe(
      data.privateTourRequests,
    )
    expect(read(queryKeys.reviews.reviews)).toBe(data.reviews)
    expect(read(queryKeys.tours.records)).toEqual({
      tours: data.tours!.tours,
      departures: data.tours!.departures,
      bookings: data.tours!.bookings,
    })
  })

  it('[E1.11] typing in the booking draft hands back the same tour records', async () => {
    const demo = startDemo()

    await demo.ready

    const before = await demo.dataClient.tours.records()

    updateCollection(demo.store, 'tours', tours => ({
      ...tours!,
      draft: { ...tours!.draft, contactName: 'Anna' },
    }))

    expect(await demo.dataClient.tours.records()).toBe(before)
  })

  it('[E1.11] a second booking on a departure the guest already holds adds nothing', async () => {
    const demo = startDemo()
    const { tours } = demo.store.getState().data
    const now = demoNow(demo.store.getState().clockStartedAt)
    const departure = tours!.departures.find(
      d => !d.closed && Date.parse(d.startsAt) > now.getTime() + 86_400_000,
    )!
    const tour = tours!.tours.find(t => t.id === departure.tourId)!
    const booking = (id: string) =>
      newBooking({
        id,
        tour,
        departure,
        draft: { ...tours!.draft, adults: 1, children: 0, infants: 0 },
        guestId: 'g-test',
        partnerId: null,
        language: 'en',
        now,
      })

    expect(
      await demo.dataClient.tours.createBooking({
        booking: booking('first'),
        language: 'en',
      }),
    ).toBe(true)
    expect(
      await demo.dataClient.tours.createBooking({
        booking: booking('second'),
        language: 'en',
      }),
    ).toBe(false)
    expect(
      demo.store
        .getState()
        .data
        .tours!
        .bookings
        .filter(b => b.guestId === 'g-test')
        .map(b => b.id),
    ).toEqual(['first'])
  })

  it('[E1.11] a gift save that would not fit in the browser\'s storage is refused and changes nothing', async () => {
    const demo = startDemo()
    const products = demo.store.getState().data.products

    await expect(
      demo.dataClient.catalog.saveProduct({
        ...products[0],
        photo: `data:image/jpeg;base64,${'A'.repeat(5_000_000)}`,
      }),
    ).rejects.toBeInstanceOf(StorageFullError)
    expect(demo.store.getState().data.products).toBe(products)
  })

  it('[E1.11] a command changes the store, and only the changed collection is read again', async () => {
    const demo = startDemo()

    await demo.ready

    const cache = demo.queryClient.getQueryCache()
    const articlesRead = cache.find({ queryKey: queryKeys.content.articles })!
      .state
      .dataUpdateCount
    const comment = demo.store.getState().data.comments.find(c => !c.hidden)!

    await demo.dataClient.content.setCommentHidden({
      id: comment.id,
      hidden: true,
    })

    expect(
      demo.store.getState().data.comments.find(c => c.id === comment.id)?.hidden,
    ).toBe(true)
    await waitFor(() =>
      expect(
        demo.queryClient.getQueryData(queryKeys.content.comments),
      ).toBe(demo.store.getState().data.comments),
    )
    expect(
      cache.find({ queryKey: queryKeys.content.articles })!.state.dataUpdateCount,
    ).toBe(articlesRead)
  })

  it('[E1.11] store writes outside the data client (a demo control, the prototype bar\'s reset) reach the cache', async () => {
    const demo = startDemo()
    const cached = () =>
      demo.queryClient.getQueryData<unknown[]>(queryKeys.content.comments)

    await demo.ready
    updateCollection(demo.store, 'comments', () => [])

    await waitFor(() => expect(cached()).toEqual([]))

    demo.store.reset()

    await waitFor(() =>
      expect(cached()).toBe(demo.store.getState().data.comments),
    )
    expect(cached()).toHaveLength(createSeedState().data.comments.length)
  })
})

/**
 * No store bridge here, so the screen sees a change only if its own mutation invalidates the query
 * it reads, which is what the API needs.
 */
function renderWithoutBridge<T>(hook: () => T, store: DemoStore) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const client = createDemoDataClient(store)

  return renderHook(hook, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <DataClientProvider client={client}>
          <LocaleProvider>
            <DemoProvider store={store}>
              <Suspense fallback={null}>{children}</Suspense>
            </DemoProvider>
          </LocaleProvider>
        </DataClientProvider>
      </QueryClientProvider>
    ),
  })
}

describe('mutation then invalidate', () => {
  it('[E1.11] hiding a comment on M18 invalidates the comments query, so the row shows it hidden', async () => {
    const store = createDemoStore({ ...createSeedState(), role: 'owner' })
    const { result } = renderWithoutBridge(() => useMerchantComments([]), store)

    await waitFor(() => expect(result.current.rows.length).toBeGreaterThan(0))
    const row = result.current.rows.find(r => !r.hidden)!

    act(() => result.current.setHidden(row.id, true))

    await waitFor(() =>
      expect(result.current.rows.find(r => r.id === row.id)?.hidden).toBe(
        true,
      ),
    )
  })
})
