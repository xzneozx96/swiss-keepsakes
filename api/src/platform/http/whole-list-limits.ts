import type { Context } from 'hono'
import type { AppEnv } from './app.ts'

/**
 * ADR-033 section 10: what a whole list does when it grows. The keys are the routes of `WHOLE_LISTS` in
 * `test/contract/page-schemas.test.ts`, which fails when a route there has no entry here (or the other way round).
 *
 * - `warnAt`: from this many rows the route logs a warning, so the list is reviewed before it is too big
 *   (80 % of the cap, ADR-033 section 10). `null` for a list its own query bounds, which cannot grow.
 * - `cap`: above this many rows the route logs an error and answers the first `cap` rows. `null` means never cut.
 */
export interface WholeListLimit { warnAt: number | null, cap: number | null }

export const WHOLE_LIST_LIMITS = {
  'GET /api/public/blog-categories': { warnAt: 160, cap: 200 },
  'GET /api/public/map-categories': { warnAt: 160, cap: 200 },
  // The map never cuts a pin (owner, 05.11.2026): only the warning, which starts the viewport-query decision (ADR-006).
  'GET /api/public/map': { warnAt: 800, cap: null },
  'GET /api/public/keepsakes/{slug}/pickup-points': { warnAt: 40, cap: 50 },
  // Not in the ADR table (judged whole, "tens"): a warning at 50 variants, never cut.
  'GET /api/public/keepsakes/{slug}/availability': { warnAt: 50, cap: null },
  'GET /api/store/{storeId}/categories/{kind}': { warnAt: 160, cap: 200 },
  'GET /api/store/{storeId}/pickup-places': { warnAt: 40, cap: 50 },
  // The next two answer two arrays each (published and drafts; members and invitations). The cap counts both together.
  'GET /api/store/{storeId}/media/{mediaId}/uses': { warnAt: 160, cap: 200 },
  'GET /api/store/{storeId}/members': { warnAt: 40, cap: 50 },
  // Each lookup reads at most 50 ids, so its rows cannot pass 50 either.
  'GET /api/store/{storeId}/story-groups/lookup': { warnAt: 40, cap: 50 },
  'GET /api/store/{storeId}/pins/lookup': { warnAt: 40, cap: 50 },
  'GET /api/store/{storeId}/products/lookup': { warnAt: 40, cap: 50 },
  'GET /api/store/{storeId}/products/option-names': { warnAt: 40, cap: 50 },
  // Search-as-you-type: the query itself returns the first 20 matches, so the list cannot grow.
  'GET /api/store/{storeId}/pins/story-options': { warnAt: null, cap: null },
} as const satisfies Record<string, WholeListLimit>

export type WholeListRoute = keyof typeof WHOLE_LIST_LIMITS

/**
 * Checks a whole list against its limits and answers the body to send. Warns from `warnAt` rows, and above `cap` logs an error and
 * answers the first `cap` rows. A list with no `cap` is never cut. The log carries the route, the store (when the route has one) and the count.
 * A body may hold several arrays (`published` and `drafts`): the count is their total, and a cut keeps the first rows in key order.
 */
export function limitWholeList<T extends object>(c: Context<AppEnv>, route: WholeListRoute, body: T): T {
  const fieldsOf = body as Record<string, unknown>
  const { warnAt, cap }: WholeListLimit = WHOLE_LIST_LIMITS[route]
  const keys = Object.keys(body).filter(key => Array.isArray(fieldsOf[key]))
  const count = keys.reduce((total, key) => total + (fieldsOf[key] as unknown[]).length, 0)
  const fields = { route, storeId: c.req.param('storeId'), count }
  if (cap !== null && count > cap) {
    c.get('logger').error({ event: 'list.over-cap', ...fields, cap }, 'a whole list is over its cap: the first rows are answered and the list must move to paging')
    let left = cap
    const cut = { ...fieldsOf }
    for (const key of keys) {
      const kept = (fieldsOf[key] as unknown[]).slice(0, left)
      cut[key] = kept
      left -= kept.length
    }
    return cut as T
  }
  if (warnAt !== null && count >= warnAt)
    c.get('logger').warn({ event: 'list.near-cap', ...fields, warnAt, cap }, 'a whole list is nearly at the size it was chosen for: review it before it grows')
  return body
}
