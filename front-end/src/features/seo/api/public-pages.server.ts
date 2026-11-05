import type { PublicLanguage } from '@sk/api-contract'
import type { PublicCard, PublishedPages } from '../lib/sitemap'
import { createApiClient, MAX_PAGE_LIMIT, publicStoryCardSchema, publicTourCardSchema } from '@sk/api-contract'
import { answer, PAGE_READ_TIMEOUT_MS, timeout } from '@/features/data-client/api-transport'
import { ApiProblem } from '@/features/data-client/errors'
import { readAllPages } from '@/features/data-client/paged-query'
import { apiOrigin } from '@/lib/api-origin'

const LANGUAGES: readonly PublicLanguage[] = ['en', 'de']
const CACHE_MS = 60_000

const CARD_FIELDS = { id: true, slug: true, language: true, fallback: true } as const
const storyCards = publicStoryCardSchema.pick(CARD_FIELDS).array()
const tourCards = publicTourCardSchema.pick(CARD_FIELDS).array()

export class PublicPagesUnavailable extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicPagesUnavailable'
  }
}

let cached: { value: PublishedPages, expiresAt: number } | null = null
let inFlight: Promise<PublishedPages> | null = null

export function resetPublishedPagesCache(): void {
  cached = null
  inFlight = null
}

async function readCards(
  client: ReturnType<typeof createApiClient>,
  kind: 'stories' | 'tours',
  lang: PublicLanguage,
): Promise<PublicCard[]> {
  try {
    // The lists are paged (ADR-033): read every page, 20 at a time, until the search moves to the server.
    const path = kind === 'stories' ? '/api/public/stories' : '/api/public/tours'
    const items: unknown = await readAllPages(cursor => answer(client.GET(path, { params: { query: { lang, limit: MAX_PAGE_LIMIT, ...(cursor ? { cursor } : {}) } }, ...timeout(PAGE_READ_TIMEOUT_MS) })), `Sitemap ${kind} in ${lang}`)
    const parsed = (kind === 'stories' ? storyCards : tourCards).parse(items)
    return parsed.filter(card => !card.fallback && card.language === lang)
  }
  catch (error) {
    throw new PublicPagesUnavailable(`Cannot read published ${kind} in ${lang}: ${error instanceof ApiProblem ? `answered ${error.status}` : error instanceof Error ? error.message : String(error)}`)
  }
}

async function readAll(now: () => number): Promise<PublishedPages> {
  // The client reads globalThis.fetch when it is created, so build it per load.
  const client = createApiClient(apiOrigin())
  const [storiesEn, storiesDe, toursEn, toursDe] = await Promise.all(
    (['stories', 'tours'] as const).flatMap(kind => LANGUAGES.map(lang => readCards(client, kind, lang))),
  )
  const value: PublishedPages = {
    stories: { en: storiesEn, de: storiesDe },
    tours: { en: toursEn, de: toursDe },
  }
  cached = { value, expiresAt: now() + CACHE_MS }
  return value
}

/** Callers that arrive while a load runs share it; a failed load caches nothing, so the next call retries. */
export function loadPublishedPages(now: () => number = Date.now): Promise<PublishedPages> {
  if (cached && now() < cached.expiresAt)
    return Promise.resolve(cached.value)

  if (!inFlight) {
    const load = readAll(now).finally(() => {
      if (inFlight === load)
        inFlight = null
    })
    inFlight = load
  }

  return inFlight
}
