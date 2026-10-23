import type { AcceptedInvitation } from '@sk/api-contract'
import type { AcceptRefusal } from '../lib/refusals'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { heldInvitationToken, subscribeInvitationToken } from '../lib/invitation-token'
import { acceptRefusal } from '../lib/refusals'
import { ONBOARDING_PATH } from '../lib/search-params'
import { useGoToSignIn } from './use-go-to-sign-in'
import { useIdempotencyKey } from './use-idempotency-key'

export type AcceptState
  = | { kind: 'none' }
    | { kind: 'accepting' }
    | { kind: 'ready' }
    | { kind: 'signIn' }
    | { kind: 'accepted', accepted: AcceptedInvitation }
    | { kind: 'refused', refusal: AcceptRefusal }

type Outcome = { token: string } & ({ kind: 'accepted', accepted: AcceptedInvitation } | { kind: 'refused', refusal: AcceptRefusal } | { kind: 'signIn' })

/**
 * The accept half of an invitation screen, shared by A02 and the Store Manager's M01 (E2.4). It takes the
 * token that `captureInvitations` put in `sessionStorage`. A02 posts it once when the screen opens, and again for
 * a link opened later in the same tab. M01 posts it only when `accept` is called from a tap, so a crafted link
 * cannot accept for a Manager. The API answers 401 to a visitor who has not signed in. A02 then shows `signIn`,
 * which goes to sign-in and comes back to `returnTo`, never carrying the token, and a tap on M01 goes there at
 * once. What the answer means for the held token is done by the client, so it happens even if this screen is
 * gone by then. A retry sends the same `Idempotency-Key` for as long as the answer is unknown.
 */
export function useAcceptInvitation(returnTo: string = ONBOARDING_PATH, { manual = false }: { manual?: boolean } = {}) {
  const goToSignIn = useGoToSignIn(returnTo)
  const { submit, isPending } = useSubmit('stores', 'acceptInvitation')
  const token = useSyncExternalStore(subscribeInvitationToken, heldInvitationToken)
  const key = useIdempotencyKey({ token })
  const [outcome, setOutcome] = useState<Outcome>()
  const startedRef = useRef<string>(undefined)

  const run = (held: string): boolean =>
    submit({ token: held, idempotencyKey: key.next() }, {
      onSuccess: (accepted) => {
        key.settled()
        setOutcome({ token: held, kind: 'accepted', accepted })
      },
      onError: (error) => {
        key.settled(error)
        if (error instanceof ApiProblem && error.status === 401) {
          if (manual)
            goToSignIn()
          else
            setOutcome({ token: held, kind: 'signIn' })

          return
        }
        setOutcome({ token: held, kind: 'refused', refusal: acceptRefusal(error) })
      },
    })

  useEffect(() => {
    if (manual || !token || startedRef.current === token)
      return
    if (run(token))
      startedRef.current = token
  })

  // An answer belongs to the token it was for. The accepted token is gone from storage, so it still counts.
  const current = outcome && (token === undefined || token === outcome.token) ? outcome : undefined
  let state: AcceptState = { kind: 'none' }

  if (token)
    state = manual && !isPending ? { kind: 'ready' } : { kind: 'accepting' }

  if (current?.kind === 'accepted')
    state = { kind: 'accepted', accepted: current.accepted }
  else if (current?.kind === 'refused')
    state = { kind: 'refused', refusal: current.refusal }
  else if (current?.kind === 'signIn')
    state = { kind: 'signIn' }

  const retry = () => {
    if (!token)
      return
    setOutcome(undefined)
    run(token)
  }

  return { state, token, retry, accept: retry, signIn: goToSignIn }
}
