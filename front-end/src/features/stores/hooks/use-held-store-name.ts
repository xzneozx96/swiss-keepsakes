import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { queryKeys } from '@/features/data-client'

/**
 * The store's name from the invitation preview the flow reads anyway (never a new call), so a refusal from the accept
 * call can still put the name on the photo. A spent token removes its preview from the cache right after the refusal, so
 * the name is taken as the preview arrives and kept.
 */
export function useHeldStoreName(token: string | undefined): string | undefined {
  const queryClient = useQueryClient()
  const [name, setName] = useState<string | undefined>(() => queryClient.getQueriesData<{ storeName?: string }>({ queryKey: queryKeys.stores.invitationPreview }).at(0)?.[1]?.storeName)

  useEffect(() => {
    if (!token)
      return

    return queryClient.getQueryCache().subscribe((event) => {
      const data = event.query.state.data as { storeName?: string } | undefined

      if (event.query.queryKey[queryKeys.stores.invitationPreview.length] === token && data?.storeName)
        setName(data.storeName)
    })
  }, [queryClient, token])

  return name
}
