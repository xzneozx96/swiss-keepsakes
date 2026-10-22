import type { AcceptedInvitation } from '@sk/api-contract'
import type { AcceptRefusal } from '../lib/refusals'

import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { dropInvitationToken, heldInvitationToken } from '../lib/invitation-token'
import { rememberStore } from '../lib/owner-store'
import { acceptRefusal, spentToken } from '../lib/refusals'
import { ONBOARDING_PATH } from '../lib/search-params'

export type AcceptState
  = | { kind: 'none' }
    | { kind: 'accepting' }
    | { kind: 'accepted', accepted: AcceptedInvitation }
    | { kind: 'refused', refusal: AcceptRefusal }

/**
 * The accept half of an invitation screen, shared by A02 and the Store Manager's M01 (E2.4). It takes the
 * token that `takeInvitationFromAddress` put in `sessionStorage` and posts it once when the screen opens. The
 * API answers 401 to a visitor who has not signed in, and the screen then goes to sign-in and comes back to
 * `returnTo`, which never carries the token. Whatever the answer, the token leaves the address and, when the
 * link can never work again, the storage too.
 */
export function useAcceptInvitation(returnTo: string = ONBOARDING_PATH) {
  const navigate = useNavigate()
  const { submit } = useSubmit('stores', 'acceptInvitation')
  const [token] = useState(heldInvitationToken)
  const [state, setState] = useState<AcceptState>(token ? { kind: 'accepting' } : { kind: 'none' })
  const startedRef = useRef(false)

  const run = (held: string) => {
    submit({ token: held }, {
      onSuccess: (accepted) => {
        dropInvitationToken()
        rememberStore(accepted.storeId)
        setState({ kind: 'accepted', accepted })
      },
      onError: (error) => {
        if (error instanceof ApiProblem && error.status === 401) {
          void navigate({ to: '/sign-in', search: { returnTo }, replace: true })

          return
        }
        const refusal = acceptRefusal(error)

        if (spentToken(refusal))
          dropInvitationToken()
        setState({ kind: 'refused', refusal })
      },
    })
  }

  useEffect(() => {
    if (!token || startedRef.current)
      return
    startedRef.current = true
    run(token)
  })

  const retry = () => {
    if (!token)
      return
    setState({ kind: 'accepting' })
    run(token)
  }

  return { state, retry }
}
