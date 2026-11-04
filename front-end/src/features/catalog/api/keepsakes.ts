import type { PublicKeepsakeList, PublicLanguage } from '@sk/api-contract'
import { answer, timeout } from '@/features/data-client/api-transport'
import { apiOrigin } from './api-origin'

/** The published keepsakes in one language. A failed read throws; the route turns that into its error state. */
export async function fetchKeepsakeList(lang: PublicLanguage): Promise<PublicKeepsakeList> {
  const { createApiClient, publicKeepsakeListSchema } = await import('@sk/api-contract')
  const client = createApiClient(apiOrigin())
  const list = await answer(client.GET('/api/public/keepsakes', { ...timeout(), params: { query: { lang } } }))

  return publicKeepsakeListSchema.parse(list)
}
