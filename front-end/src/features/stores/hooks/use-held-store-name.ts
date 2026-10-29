import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { queryKeys } from '@/features/data-client'

const previewKey = (token: string) => [...queryKeys.stores.invitationPreview, token]
const nameOf = (data: unknown) => (data as { storeName?: string } | undefined)?.storeName

/**
 * The store's name from the invitation preview of the held link, read from the cache the flow fills anyway (never a
 * new call), so a refusal from the accept call can still put the name on the photo. A spent token is dropped and its
 * preview removed right after the refusal, so the name is taken as the preview arrives and kept for that link. A
 * different link starts with no name.
 */
export function useHeldStoreName(token: string | undefined): string | undefined {
  const queryClient = useQueryClient()
  const [held, setHeld] = useState<{ token?: string, name?: string }>(() => ({ token, name: token ? nameOf(queryClient.getQueryData(previewKey(token))) : undefined }))

  if (token && held.token !== token)
    setHeld({ token, name: nameOf(queryClient.getQueryData(previewKey(token))) })

  useEffect(() => {
    if (!token)
      return

    return queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey
      const name = nameOf(event.query.state.data)

      if (name && key.length === 3 && key[0] === queryKeys.stores.invitationPreview[0] && key[1] === queryKeys.stores.invitationPreview[1] && key[2] === token)
        setHeld({ token, name })
    })
  }, [queryClient, token])

  return token && held.token !== token ? undefined : held.name
}
