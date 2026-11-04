import { useQuery } from '@tanstack/react-query'

import { useLocale } from '@/contexts/locale-context'
import { catalogQueries } from '@/features/catalog/api/queries'
import { useDataClient } from '@/features/data-client'
import { victorinoxItems } from '../lib/victorinox-items'

/**
 * The Victorinox designs of the showcase, read like the tiles are: a plain query, so a slow or failed read is data for the block
 * (a skeleton, an error with retry) and never a suspended page, on the server or in the browser.
 */
export function useVictorinoxItems() {
  const { language } = useLocale()
  const client = useDataClient()
  const { data, isPending, isError, refetch } = useQuery({
    ...catalogQueries.products(client),
    select: products => victorinoxItems(products, language),
  })

  return { items: data ?? [], isPending, isFailed: isError, retry: () => void refetch() }
}
