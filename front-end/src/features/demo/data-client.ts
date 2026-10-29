import type { QueryClient, QueryExecuteOptions, QueryKey } from '@tanstack/react-query'
import type { DemoStore } from './store'
import type { DemoData } from './types'
import type { DataClient, FeedbackHandle } from '@/features/data-client'

import { createAccountDemoClient } from '@/features/account/api/demo-client'
import { accountQueries } from '@/features/account/api/queries'
import { createCatalogDemoClient } from '@/features/catalog/api/demo-client'
import { catalogQueries } from '@/features/catalog/api/queries'
import { createCategoriesClient } from '@/features/categories/api/api-client'
import { createContentDemoClient } from '@/features/content/api/demo-client'
import { contentQueries } from '@/features/content/api/queries'
import { createApiQueryClient, createFeedback } from '@/features/data-client'
import { createKeepsakesClient } from '@/features/keepsakes/api/api-client'
import { createNotificationsDemoClient } from '@/features/notifications/api/demo-client'
import { notificationsQueries } from '@/features/notifications/api/queries'
import { createOrdersDemoClient } from '@/features/orders/api/demo-client'
import { ordersQueries } from '@/features/orders/api/queries'
import { createPartnersDemoClient } from '@/features/partners/api/demo-client'
import { partnersQueries } from '@/features/partners/api/queries'
import { createPlacesClient } from '@/features/places/api/api-client'
import { createReportsDemoClient } from '@/features/reports/api/demo-client'
import { reportsQueries } from '@/features/reports/api/queries'
import { createRequestsDemoClient } from '@/features/requests/api/demo-client'
import { requestsQueries } from '@/features/requests/api/queries'
import { createReviewsDemoClient } from '@/features/reviews/api/demo-client'
import { reviewsQueries } from '@/features/reviews/api/queries'
import { createStoresClient } from '@/features/stores/api/api-client'
import { createToursDemoClient } from '@/features/tours/api/demo-client'
import { toursQueries } from '@/features/tours/api/queries'
import { createTourSeed } from '@/features/tours/seed'
import { createSeedState } from './seed'
import { createDemoStore, loadDemoState } from './store'

/** A collection of the demo data, read into the cache by its query. */
function collection<TData, TKey extends QueryKey>(
  query: (
    client: DataClient,
  ) => QueryExecuteOptions<TData, Error, TData, TData, TKey>,
  /** What the query reads from a state, so a page can render before the read has run. */
  initial: (data: DemoData) => TData,
) {
  return {
    queryKey: (client: DataClient) => query(client).queryKey,
    prime: (queryClient: QueryClient, client: DataClient, data: DemoData) => {
      // Built with the whole query, not set by key, so a later refetch has its read function.
      queryClient
        .getQueryCache()
        .build(queryClient, queryClient.defaultQueryOptions(query(client)))
        .setData(initial(data))
    },
    read: (queryClient: QueryClient, client: DataClient) =>
      queryClient.query(query(client)),
  }
}

/**
 * Data the browser keeps for itself with the API too (the cart, saved gifts, who is signed in,
 * drafts, partner sessions), so screens read it from the store, and the order counter, which only
 * commands use.
 */
type StoreOnlyKey
  = | 'cart'
    | 'favouriteProductIds'
    | 'signedInGuestId'
    | 'adviceDraft'
    | 'partnerSessions'
    | 'nextOrderNumber'

const collections = {
  guests: collection(accountQueries.guests, d => d.guests),
  products: collection(catalogQueries.products, d => d.products),
  subcategories: collection(catalogQueries.subcategories, d => d.subcategories),
  pickupPlaces: collection(catalogQueries.pickupPlaces, d => d.pickupPlaces),
  articles: collection(contentQueries.articles, d => d.articles),
  comments: collection(contentQueries.comments, d => d.comments),
  mail: collection(notificationsQueries.mail, d => d.mail),
  orders: collection(ordersQueries.orders, d => d.orders),
  partners: collection(partnersQueries.partners, d => d.partners),
  referralVisits: collection(partnersQueries.referralVisits, d => d.referralVisits),
  commissionAdjustments: collection(partnersQueries.commissionAdjustments, d => d.commissionAdjustments),
  partnerPayouts: collection(partnersQueries.partnerPayouts, d => d.partnerPayouts),
  costs: collection(reportsQueries.costs, d => d.costs),
  adviceQuestions: collection(requestsQueries.adviceQuestions, d => d.adviceQuestions),
  adviceRequests: collection(requestsQueries.adviceRequests, d => d.adviceRequests),
  privateTourRequests: collection(requestsQueries.privateTourRequests, d => d.privateTourRequests),
  reviews: collection(reviewsQueries.reviews, d => d.reviews),
  tours: collection(toursQueries.records, (d) => {
    const { tours, departures, bookings } = d.tours ?? createTourSeed()

    return { tours, departures, bookings }
  }),
} satisfies Record<
  Exclude<keyof DemoData, StoreOnlyKey>,
  ReturnType<typeof collection>
>

type QueriedKey = keyof typeof collections

const queriedKeys = Object.keys(collections) as QueriedKey[]

/** The query that reads a collection of the demo data; none for data only the store keeps. */
export function demoCollectionKey(
  key: keyof DemoData,
  client: DataClient,
): QueryKey | undefined {
  return key in collections
    ? collections[key as QueriedKey].queryKey(client)
    : undefined
}

export function createDemoDataClient(store: DemoStore): DataClient {
  return {
    account: createAccountDemoClient(store),
    catalog: createCatalogDemoClient(store),
    categories: createCategoriesClient(),
    places: createPlacesClient(),
    content: createContentDemoClient(store),
    keepsakes: createKeepsakesClient(),
    notifications: createNotificationsDemoClient(store),
    orders: createOrdersDemoClient(store),
    partners: createPartnersDemoClient(store),
    reports: createReportsDemoClient(store),
    requests: createRequestsDemoClient(store),
    reviews: createReviewsDemoClient(store),
    stores: createStoresClient(),
    tours: createToursDemoClient(store),
  }
}

/**
 * Demo reads come from the browser-held store, so a result changes only when the store does, and
 * `bridgeStore` invalidates it then. Nothing goes stale with time or is collected, retrying cannot
 * fix a failed local read, and being offline must not pause a read that never uses the network.
 * The store already keeps every unchanged object when it updates, so the cache holds the store's
 * own arrays instead of a structurally shared copy, and screens re-render exactly as they did on
 * store selectors. A feature that moves to the API sets its own options on its queries. The cache
 * is `createApiQueryClient`'s (`api-feedback.ts`), so every command's `meta` still shows its toast
 * in demo mode.
 */
function createDemoQueryClient(feedback: FeedbackHandle): QueryClient {
  return createApiQueryClient(feedback, {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
      retry: false,
      networkMode: 'always',
      structuralSharing: false,
    },
    mutations: { networkMode: 'always' },
  })
}

/**
 * The store holds the only copy of the demo data and the cache holds what the queries last read
 * from it. Any change to a collection, from a mutation, the prototype bar or a demo control,
 * invalidates that collection's query, inactive ones too, so no screen mounts on an old read.
 * Other tabs keep their own copy, as before: the store never listened for their saves.
 */
function bridgeStore(
  store: DemoStore,
  queryClient: QueryClient,
  client: DataClient,
) {
  let previous = store.getState().data

  store.subscribe(() => {
    const next = store.getState().data

    if (next === previous)
      return
    for (const key of queriedKeys) {
      if (next[key] !== previous[key]) {
        void queryClient.invalidateQueries({
          queryKey: collections[key].queryKey(client),
          refetchType: 'all',
        })
      }
    }
    previous = next
  })
}

function readCollections(queryClient: QueryClient, dataClient: DataClient) {
  return Promise.all(
    queriedKeys.map(key => collections[key].read(queryClient, dataClient)),
  )
}

function assemble(store: DemoStore) {
  const dataClient = createDemoDataClient(store)
  const feedback = createFeedback()
  const queryClient = createDemoQueryClient(feedback)

  bridgeStore(store, queryClient, dataClient)

  return { store, dataClient, queryClient, feedback }
}

/**
 * The demo's store, data client and query client, loaded from the browser's saved copy. `ready` settles
 * once every collection has been read into the cache. No route uses it any more (a page starts with
 * `startSeedDemo`); the unit tests use it to get a ready demo without a server render.
 */
export function startDemo() {
  const parts = assemble(createDemoStore(loadDemoState()))

  return { ...parts, ready: readCollections(parts.queryClient, parts.dataClient) }
}

/**
 * The demo's store, data client and query client for a page the server renders: the seed, with nothing read
 * from or written to storage and no collection read, so the server and the browser's first render show the
 * same thing. Each call makes its own store, so a server never shares one between requests. The store queues
 * any update made before `restore` (it does not change the state). `restore` then puts the saved state in the
 * store, replays the queued updates on top of it and saves the result, once the page has hydrated, and settles
 * when every collection has been read.
 */
export function startSeedDemo() {
  const parts = assemble(createDemoStore(createSeedState(), { persist: false }))

  // The seed is already in memory, so the cache holds it from the start: a screen renders its text at once
  // on the server and in the browser's first render, and does not suspend on a read of the same seed.
  for (const key of queriedKeys)
    collections[key].prime(parts.queryClient, parts.dataClient, parts.store.getState().data)

  return {
    ...parts,
    restore: () => {
      // Corrupt saved data must not leave the store queueing for good: restore with the seed, which also starts saving.
      let saved = createSeedState()

      try {
        saved = loadDemoState()
      }
      catch (error) {
        console.error('The saved demo state could not be read, starting from the seed', error)
      }
      parts.store.restore(saved)

      return readCollections(parts.queryClient, parts.dataClient)
    },
  }
}
