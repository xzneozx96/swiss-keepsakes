import type { QueryExecuteOptions, QueryKey } from '@tanstack/react-query'
import type { DemoStore } from './store'
import type { DemoData } from './types'
import type { DataClient } from '@/features/data-client'

import { QueryClient } from '@tanstack/react-query'
import { createContentDemoClient } from '@/features/content/api/demo-client'
import { contentQueries } from '@/features/content/api/queries'
import { createDemoStore, loadDemoState } from './store'

/** A collection of the demo data, read into the cache by its query. */
function collection<TData, TKey extends QueryKey>(
  query: (
    client: DataClient,
  ) => QueryExecuteOptions<TData, Error, TData, TData, TKey>,
) {
  return {
    queryKey: (client: DataClient) => query(client).queryKey,
    read: (queryClient: QueryClient, client: DataClient) =>
      queryClient.query(query(client)),
  }
}

const collections = {
  articles: collection(contentQueries.articles),
  comments: collection(contentQueries.comments),
} satisfies Partial<
  Record<keyof DemoData, ReturnType<typeof collection>>
>

type QueriedKey = keyof typeof collections

const queriedKeys = Object.keys(collections) as QueriedKey[]

export function createDemoDataClient(store: DemoStore): DataClient {
  return {
    content: createContentDemoClient(store),
  }
}

/**
 * Demo reads come from the browser-held store, so a result changes only when the store does, and
 * `bridgeStore` invalidates it then. Nothing goes stale with time or is collected, retrying cannot
 * fix a failed local read, and being offline must not pause a read that never uses the network.
 * The store already keeps every unchanged object when it updates, so the cache holds the store's
 * own arrays instead of a structurally shared copy, and screens re-render exactly as they did on
 * store selectors. A feature that moves to the API sets its own options on its queries.
 */
function createDemoQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
        networkMode: 'always',
        structuralSharing: false,
      },
      mutations: { networkMode: 'always' },
    },
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

/**
 * The demo's store, data client and query client. `ready` settles once every collection has been
 * read into the cache, so no screen ever waits on a demo read; render after it.
 */
export function startDemo() {
  const store = createDemoStore(loadDemoState())
  const dataClient = createDemoDataClient(store)
  const queryClient = createDemoQueryClient()

  bridgeStore(store, queryClient, dataClient)

  const ready = Promise.all(
    queriedKeys.map(key => collections[key].read(queryClient, dataClient)),
  )

  return { store, dataClient, queryClient, ready }
}
