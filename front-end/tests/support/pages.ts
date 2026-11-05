import { pinListSchema, storyListSchema } from '@sk/api-contract'

/** The answer of the pins list for `items`, as one page. A test that checks paging passes `over`. */
export function pinPage(items: unknown[], over: Record<string, unknown> = {}) {
  const published = items.filter(item => (item as { status?: string }).status === 'published').length

  return pinListSchema.parse({
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    statuses: { draft: items.length - published, published, hidden: 0, ended: 0 },
    stays: { short_stay: 0, multi_day: 0, both: items.length },
    types: { place: items.length, event: 0 },
    categories: { none: items.length },
    ...over,
  })
}

/** The answer of the stories list for `items`, as one page. A test that checks paging passes `over`. */
export function storyPage(items: unknown[], over: Record<string, unknown> = {}) {
  return storyListSchema.parse({ items, total: items.length, page: 1, pageSize: 10, tabs: { all: items.length, published: 0, drafts: items.length }, ...over })
}

const WWW = /^www\./

interface PinLike { status: string, title: { en?: string, de?: string }, categoryIds: string[], hasDates: boolean, stayTag: string }

const list = (url: URL, name: string) => (url.searchParams.get(name) ?? '').split(',').filter(Boolean)

/**
 * What the pins route answers for `url` over `items`: the filters, the search, the page and the facet counts, the way the API does
 * (a facet counts with the search and the other groups, not its own ticks; a category counts its children, given by `parents`).
 */
export function serverPinPage(items: PinLike[], url: URL, parents: Record<string, string> = {}) {
  const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
  const page = Number(url.searchParams.get('page') ?? 1)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const groups = { status: list(url, 'status'), category: list(url, 'category'), stay: list(url, 'stay'), type: list(url, 'type') }
  const kind = (item: PinLike) => (item.hasDates ? 'event' : 'place')
  const matches = (item: PinLike, skip?: keyof typeof groups) =>
    (q === '' || [item.title.en, item.title.de].some(text => text?.toLowerCase().includes(q)))
    && (skip === 'status' || groups.status.length === 0 || groups.status.includes(item.status))
    && (skip === 'stay' || groups.stay.length === 0 || groups.stay.includes(item.stayTag))
    && (skip === 'type' || groups.type.length === 0 || groups.type.includes(kind(item)))
    && (skip === 'category' || groups.category.length === 0 || groups.category.some(id => (id === 'none' ? item.categoryIds.length === 0 : item.categoryIds.includes(id))))
  const count = (skip: keyof typeof groups, test: (item: PinLike) => boolean) => items.filter(item => matches(item, skip) && test(item)).length
  const shown = items.filter(item => matches(item))
  const ids = new Set([...items.flatMap(item => item.categoryIds), ...Object.values(parents)])

  return pinListSchema.parse({
    items: shown.slice((page - 1) * pageSize, page * pageSize),
    total: shown.length,
    page,
    pageSize,
    statuses: Object.fromEntries(['draft', 'published', 'hidden', 'ended'].map(status => [status, count('status', item => item.status === status)])),
    stays: Object.fromEntries(['short_stay', 'multi_day', 'both'].map(stay => [stay, count('stay', item => item.stayTag === stay)])),
    types: { place: count('type', item => kind(item) === 'place'), event: count('type', item => kind(item) === 'event') },
    categories: { none: count('category', item => item.categoryIds.length === 0), ...Object.fromEntries(Array.from(ids, id => [id, count('category', item => item.categoryIds.some(own => own === id || parents[own] === id))])) },
  })
}

interface StoryLike { title: { en?: string, de?: string }, languages: Record<string, { status: string } | null> }

/** What the stories route answers for `url` over `items`: the status tab, the search and the page, with the tab counts under the search. */
export function serverStoryPage(items: StoryLike[], url: URL) {
  const pageSize = Number(url.searchParams.get('pageSize') ?? 10)
  const page = Number(url.searchParams.get('page') ?? 1)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const status = url.searchParams.get('status') ?? 'all'
  const live = (item: StoryLike) => Object.values(item.languages).some(version => version?.status === 'published')
  const found = items.filter(item => q === '' || [item.title.en, item.title.de].some(text => text?.toLowerCase().includes(q)))
  const shown = found.filter(item => status === 'all' || live(item) === (status === 'published'))

  return storyListSchema.parse({
    items: shown.slice((page - 1) * pageSize, page * pageSize),
    total: shown.length,
    page,
    pageSize,
    tabs: { all: found.length, published: found.filter(live).length, drafts: found.filter(item => !live(item)).length },
  })
}

interface OptionLike { groupId: string, title: { en?: string, de?: string }, publishedLanguages: string[] }

/** What the story picker route answers: live stories whose title holds `q`, at most `limit`, and the chosen `groupId` whatever its state. */
export function serverStoryOptions(options: OptionLike[], url: URL) {
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const chosen = url.searchParams.get('groupId')
  const limit = Number(url.searchParams.get('limit') ?? 10)
  const matches = options.filter(option => option.publishedLanguages.length > 0 && (q === '' || [option.title.en, option.title.de].some(text => text?.toLowerCase().includes(q)))).slice(0, limit)
  const extra = options.filter(option => option.groupId === chosen && !matches.includes(option))

  return [...matches, ...extra]
}

/** The body the pins routes answer for `path` (with its query) under `base` (`/api/store/<id>`): the paged list and the lookup by id and host. Undefined for any other path. */
export function pinsAnswer(items: PinLike[], path: string, base: string) {
  const url = new URL(path, 'http://x')
  if (url.pathname === `${base}/pins`)
    return serverPinPage(items, url)
  if (url.pathname !== `${base}/pins/lookup`)
    return undefined
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean)
  const host = url.searchParams.get('host')

  return { items: items.filter(item => ids.includes((item as unknown as { id: string }).id) || (host && (item as unknown as { status: string, outboundUrl: string | null }).status === 'published' && new URL((item as unknown as { outboundUrl: string }).outboundUrl ?? 'http://none.invalid').hostname.replace(WWW, '') === host)) }
}

/** The body the stories routes answer for `path` under `base`: the paged list and the lookup by id. Undefined for any other path. */
export function storiesAnswer(items: StoryLike[], path: string, base: string) {
  const url = new URL(path, 'http://x')
  if (url.pathname === `${base}/story-groups`)
    return serverStoryPage(items, url)
  if (url.pathname !== `${base}/story-groups/lookup`)
    return undefined
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean)

  return { items: items.filter(item => ids.includes((item as unknown as { groupId: string }).groupId)) }
}
