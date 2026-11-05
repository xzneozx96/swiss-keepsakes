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
 * Every item of a cursor list, page after page. Search and the sitemap use it until the search moves to the server (ADR-033, slice 6).
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

/** A page of a numbered list (ADR-033, per-store merchant tables). */
export interface NumberedPage {
  items: readonly unknown[]
  total: number
}

/** The page size `readAllNumberedPages` asks for: the most the API allows. */
export const WHOLE_LIST_PAGE_SIZE = 20

/**
 * Every item of a numbered list, page after page, for a screen that looks rows up by id (the story editor's pickers, preview
 * and publish checks) and cannot work from one page. It stops once it has `total` rows, on an empty page, and after `MAX_PAGES`
 * pages with an error log. This is debt until those screens look their rows up by id (ADR-033, slice 4).
 */
export async function readAllNumberedPages<P extends NumberedPage>(read: (page: number) => Promise<P>, label: string): Promise<P['items'][number][]> {
  const items: P['items'][number][] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const answer = await read(page)
    items.push(...answer.items)
    if (answer.items.length === 0 || items.length >= answer.total)
      return items
  }
  console.error(`${label}: stopped after ${MAX_PAGES} pages; the list is cut`)

  return items
}
