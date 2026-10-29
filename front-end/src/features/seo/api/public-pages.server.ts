import type { PublicLanguage } from '@sk/api-contract'
import type { PublicCard, PublishedPages } from '../lib/sitemap'
import process from 'node:process'
import { createApiClient, publicStoryCardSchema, publicTourCardSchema } from '@sk/api-contract'

const LANGUAGES: readonly PublicLanguage[] = ['en', 'de']
const CACHE_MS = 60_000
const TIMEOUT_MS = 5000

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

function apiOrigin(): string {
  return process.env.API_ORIGIN || process.env.API_PROXY_TARGET || 'http://127.0.0.1:5002'
}

async function readCards(
  client: ReturnType<typeof createApiClient>,
  kind: 'stories' | 'tours',
  lang: PublicLanguage,
): Promise<PublicCard[]> {
  try {
    const options = { params: { query: { lang } }, signal: AbortSignal.timeout(TIMEOUT_MS) }
    const { data, response } = kind === 'stories'
      ? await client.GET('/api/public/stories', options)
      : await client.GET('/api/public/tours', options)
    if (!response.ok)
      throw new Error(`${kind} ${lang} answered ${response.status}`)

    const items = (data as { items?: unknown } | undefined)?.items
    const parsed = (kind === 'stories' ? storyCards : tourCards).parse(items)
    return parsed.filter(card => !card.fallback && card.language === lang)
  }
  catch (error) {
    throw new PublicPagesUnavailable(`Cannot read published ${kind} in ${lang}: ${error instanceof Error ? error.message : String(error)}`)
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
