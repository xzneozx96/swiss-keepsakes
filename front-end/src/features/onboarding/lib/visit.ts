import { referrerClassOf } from '@/lib/analytics/source'
import { isLanguage } from '@/lib/language-routing'
import { readSessionStored, writeSessionStored } from '@/lib/storage'

const VISIT_KEY = 'sk.visit'

/** `home`: the visit began on the home with no search result and no partner link. `other`: anywhere else. */
export type VisitEntry = 'home' | 'other'

export interface Visit {
  entry: VisitEntry
  cardHidden: boolean
}

/** The memory copy is what the page reads. It also keeps the visit when `sessionStorage` is blocked. */
let memory: Visit | undefined

function parseVisit(raw: string | undefined): Visit | undefined {
  if (raw === undefined)
    return undefined

  try {
    const stored = JSON.parse(raw) as Partial<Visit> | null

    return stored && (stored.entry === 'home' || stored.entry === 'other')
      ? { entry: stored.entry, cardHidden: stored.cardHidden === true }
      : undefined
  }
  catch {
    return undefined
  }
}

/** The guest home, `/{lang}` with or without a trailing slash. */
export function isHomePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  return segments.length === 1 && isLanguage(segments[0])
}

function save(visit: Visit) {
  memory = visit
  writeSessionStored(VISIT_KEY, JSON.stringify(visit))
}

/** The visit of this tab, or null before the first capture. The object stays the same until `hideCard`. */
export function getVisit(): Visit | null {
  memory ??= parseVisit(readSessionStored(VISIT_KEY))

  return memory ?? null
}

/**
 * Records how this tab's visit began, once: a visit that exists is left alone. The entry is `home` only when the first page is
 * the home (`/{lang}`) and the referrer is not a search result or a partner link (a `utm_medium` or `utm_source` tag of
 * `partner`). This is the visit, not the 30-day attribution (design 1).
 */
export function captureEntry({ pathname, search, referrer, siteHost }: { pathname: string, search: string, referrer: string, siteHost: string }) {
  if (getVisit())
    return

  const onHome = isHomePath(pathname)
  const source = referrerClassOf({ referrer, search, siteHost })

  save({ entry: onHome && source !== 'search' && source !== 'partner' ? 'home' : 'other', cardHidden: false })
}

/** The deep-link card was closed: it stays hidden for this visit. This is not a skip. */
export function hideCard() {
  const visit = getVisit()

  if (visit)
    save({ ...visit, cardHidden: true })
}

/** Test only: drops the memory copy, as a reload of the page does. */
export function resetVisitForTests() {
  memory = undefined
}
