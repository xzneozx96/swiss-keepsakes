import type { Context } from 'hono'

/**
 * ADR-033 section 12, one release: a numbered-page request WITHOUT `page` still gets the whole list (up to this cap), as the
 * route answered before it paged, so a tab loaded before the deploy keeps working. The next release removes this and the
 * default page of 1 applies. The front end always sends `page`.
 */
export const WHOLE_LIST_CAP = 500

export function wholeIfNoPage<Q extends { page: number, pageSize: number }>(c: Context, query: Q): Q {
  return c.req.query('page') === undefined ? { ...query, page: 1, pageSize: WHOLE_LIST_CAP } : query
}
