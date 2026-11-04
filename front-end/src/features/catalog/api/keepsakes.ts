import type { PublicKeepsakeList, PublicLanguage } from '@sk/api-contract'
import process from 'node:process'
import { createIsomorphicFn } from '@tanstack/react-start'
import { answer, timeout } from '@/features/data-client/api-transport'

// Server rendering has no origin of its own, so the loader reads the API at its internal address (tanstack-start.md, rule 4).
const apiOrigin = createIsomorphicFn()
  .server(() => process.env.API_ORIGIN || process.env.API_PROXY_TARGET || 'http://127.0.0.1:5002')
  .client(() => window.location.origin)

/** The published keepsakes in one language. A failed read throws; the route turns that into its error state. */
export async function fetchKeepsakeList(lang: PublicLanguage): Promise<PublicKeepsakeList> {
  const { createApiClient, publicKeepsakeListSchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const list = await answer(client.GET('/api/public/keepsakes', { ...timeout(), params: { query: { lang } } }))

  return publicKeepsakeListSchema.parse(list)
}
