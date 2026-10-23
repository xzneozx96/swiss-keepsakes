import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authFetchOptions, loadAuthClient } from '@/features/auth/lib/auth-api'
import { queryKeys } from '@/features/data-client'
import { sessionUserQuery } from '../api/queries'
import { lacksDisplayName } from '../lib/display-name'

/**
 * The signed-in user's name, for A02 and M01 (E2.4): the person says how they want to be called, and the name is
 * saved on their own account with Better Auth's `updateUser`. The invitation carries no name. The read lives with
 * the stores caches, so a sign-out removes it with them.
 */
export function useDisplayName(enabled = true) {
  const queryClient = useQueryClient()
  const user = useQuery({ ...sessionUserQuery, enabled })
  const save = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (await loadAuthClient()).updateUser({ name, fetchOptions: authFetchOptions() })

      if (error)
        throw new Error(error.message ?? 'The name could not be saved')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores.sessionUser }),
  })

  return { loaded: !user.isPending, needsName: lacksDisplayName(user.data), save: save.mutate, saving: save.isPending, failed: save.isError, reset: save.reset }
}
