import type { ContentClient } from '@/features/content/api/client'

/**
 * Everything the screens read and change, one client per feature (D19). Demo mode answers from
 * the browser-held store. A feature moves to the API by replacing only its own client.
 */
export interface DataClient {
  content: ContentClient
}
