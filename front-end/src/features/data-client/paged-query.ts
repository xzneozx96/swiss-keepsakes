import type { QueryKey } from '@tanstack/react-query'

import { infiniteQueryOptions } from '@tanstack/react-query'
import { fromApi } from './api-transport'

/** A page of a cursor list (ADR-033): the next page's opaque cursor, or null on the last page. */
export interface CursorPage {
  items: readonly unknown[]
  nextCursor: string | null
}

/**
 * The query options of a cursor list read with `useInfiniteQuery`. `read` gets the cursor of the page to load (undefined for the first).
 * Put every filter in `queryKey`, so a new filter starts again at page 1.
 */
export function pagedQueryOptions<P extends CursorPage>({ queryKey, read }: { queryKey: QueryKey, read: (cursor: string | undefined) => Promise<P> }) {
  return infiniteQueryOptions({
    ...fromApi,
    // A failed next page shows its own "Try again" in the list (InfiniteList); api-feedback keeps the toast out of it (a failed refetch still toasts).
    queryKey,
    queryFn: ({ pageParam }) => read(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: page => page.nextCursor ?? undefined,
  })
}

/** The most pages `readAllPages` reads before it stops. */
export const MAX_PAGES = 100

/**
 * Every item of a cursor list, page after page. Only the sitemap uses it: it needs every published slug, which the search cannot give
 * (ADR-033 names no whole-list read for it, so it keeps its loop at 20 a page).
 * It stops after `MAX_PAGES` pages and logs an error, so a list that never ends cannot loop forever.
 */
export async function readAllPages<P extends CursorPage>(read: (cursor: string | undefined) => Promise<P>, label: string): Promise<P['items'][number][]> {
  const items: P['items'][number][] = []
  let cursor: string | undefined

  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    const page = await read(cursor)
    items.push(...page.items)
    if (typeof page.nextCursor !== 'string')
      return items
    cursor = page.nextCursor
  }
  console.error(`${label}: stopped after ${MAX_PAGES} pages; the list is cut`)

  return items
}
