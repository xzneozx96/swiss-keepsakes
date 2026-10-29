import { useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { listIsStale } from '../lib/member-problems'
import { SETTINGS_PATH } from '../lib/search-params'
import { useGoToSignIn } from './use-go-to-sign-in'

/**
 * What every M22 command does with a refusal, beyond the toast the query client's cache already
 * shows (`meta.error`, see `api-feedback.md`): a session that ended (401) goes to sign-in and back
 * to Settings, and a 404 or 409 reads the list again so it is never stale.
 */
export function useMemberFailure(storeId: string) {
  const queryClient = useQueryClient()
  const goToSignIn = useGoToSignIn(SETTINGS_PATH)

  return (error: Error) => {
    if (error instanceof ApiProblem && error.status === 401) {
      goToSignIn()

      return
    }
    if (listIsStale(error))
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.stores.members, storeId] })
  }
}
