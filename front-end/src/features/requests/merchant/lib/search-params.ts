/** The values the requests page accepts in its URL, kept apart from the hook so the route can validate them without loading it. */

/** The tabs of `#/store/requests` (outline §3), kept in `?tab=`; absent = advice. */
export type RequestsTab = 'advice' | 'private' | 'questions'
export const REQUEST_TABS: RequestsTab[] = ['advice', 'private', 'questions']
export function isRequestsTab(value: unknown): value is RequestsTab {
  return REQUEST_TABS.includes(value as RequestsTab)
}
