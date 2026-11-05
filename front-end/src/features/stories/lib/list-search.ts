/** The status tabs of the stories table, besides All. */
export const STORY_STATUS_TABS = ['published', 'drafts'] as const

export type StoryStatus = (typeof STORY_STATUS_TABS)[number]

export const STORIES_PAGE_SIZE = 10

/**
 * The stories table's place in the URL: the status tab, the search and the page. All is no `status`, page 1 is no `page`.
 * (The content route's own `tab` is the old Comments and Reviews redirect, so the tab here is `status`.)
 */
export interface StoriesSearch {
  status?: StoryStatus
  q?: string
  page?: number
}

/** The route's `validateSearch`: anything it does not know is dropped, so a hand-edited link still opens the page. */
export function parseStoriesSearch(search: Record<string, unknown>): StoriesSearch {
  const page = Number(search.page)

  return {
    status: STORY_STATUS_TABS.find(status => status === search.status),
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}
