/**
 * The merchant menus show only pages that are ready: they read and write real data through the API
 * (a built and merged story), not sample data. The pages below are still prototypes, so the sidebar
 * and the phone bar leave them out (owner, 04.11.2026). Their routes stay and open by URL.
 *
 * To show a page, delete its line. A group with no page left disappears by itself. Paths are the
 * `to` of a menu page or phone item; the story that makes the page ready is named on each line.
 */
export const HIDDEN_UNTIL_READY: ReadonlySet<string> = new Set([
  '/store', // Today M02: E7.22 (Backlog), needs orders and handovers
  '/store/sales', // Sales overview: E8.13 (Backlog)
  '/store/reports', // Money: E8.13
  '/store/reports/sales', // Sales: E8.13
  '/store/reports/guests', // Guests: E8.13 and E8.11 (Backlog)
  '/store/reports/margin', // Margin: E8.13
  '/store/orders', // Orders M03: E7.3 (Backlog)
  '/store/calendar', // Calendar M27: E7.23 (Backlog)
  '/store/partners', // Partners M15: E8.2 (Backlog)
  '/store/partners/analytics', // Partner analytics: E8.13
  '/store/content/comments', // Comments M18: E5.4 (Backlog)
  '/store/content/reviews', // Reviews: E5.5 (Blocked)
  '/store/content/analytics', // Content analytics: E8.13
  '/store/requests', // Advice inbox M19: E4.16 (Backlog)
])

export function isReady(to: unknown) {
  return !HIDDEN_UNTIL_READY.has(String(to))
}
