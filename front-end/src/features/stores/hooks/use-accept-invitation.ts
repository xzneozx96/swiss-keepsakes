import type { AcceptedInvitation } from '@sk/api-contract'
import type { AcceptRefusal, InviteRole } from '../lib/refusals'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react'

import { queryKeys, useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { sessionUserQuery, storesQueries } from '../api/queries'
import { dropInvitationToken, heldInvitationToken, subscribeInvitationToken } from '../lib/invitation-token'
import { acceptRefusal, spentToken } from '../lib/refusals'
import { INVITATION_PATH, ONBOARDING_PATH } from '../lib/search-params'
import { useGoToSignIn } from './use-go-to-sign-in'
import { useIdempotencyKey } from './use-idempotency-key'

export type AcceptState
  = | { kind: 'none' }
    | { kind: 'accepting' }
    | { kind: 'ready' }
    | { kind: 'signIn' }
    | { kind: 'previewFailed', error: Error }
    | { kind: 'accepted', accepted: AcceptedInvitation }
    | { kind: 'refused', refusal: AcceptRefusal, role?: InviteRole }

type Outcome = { token: string } & (
  | { kind: 'accepted', accepted: AcceptedInvitation }
  | { kind: 'refused', refusal: AcceptRefusal, role?: InviteRole }
  | { kind: 'previewFailed', error: Error }
  | { kind: 'signIn' }
)

const PREVIEW_FRESH_MS = 30_000

/**
 * The accept half of an invitation screen, shared by A02 and the Store Manager's M01 (E2.4). It takes the
 * token that `captureInvitations` put in `sessionStorage` and reads the public preview first. A link the preview
 * refuses (unknown, expired, withdrawn) is a refusal at once, and its token leaves `sessionStorage`. A02 then
 * accepts by itself only for an Owner invitation and only for a visitor whose session cookie is there: a
 * Manager link goes to M01, where a tap accepts, so a crafted link cannot accept for a Manager. M01 posts only
 * when `accept` is called from a tap. The API answers 401 to a visitor who has not signed in. A02 then shows
 * `signIn`, which goes to sign-in and comes back to `returnTo`, never carrying the token, and a tap on M01 goes
 * there at once. What the answer means for the held token is done by the client, so it happens even if this
 * screen is gone by then. A retry sends the same `Idempotency-Key` for as long as the answer is unknown. Once the
 * token is spent, its preview leaves the query cache, so no token is left in a query key.
 */
export function useAcceptInvitation(returnTo: string = ONBOARDING_PATH, { manual = false }: { manual?: boolean } = {}) {
  const goToSignIn = useGoToSignIn(returnTo)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const client = useDataClient()
  const { submit, isPending } = useSubmit('stores', 'acceptInvitation')
  const token = useSyncExternalStore(subscribeInvitationToken, heldInvitationToken)
  const key = useIdempotencyKey({ token })
  const [outcome, setOutcome] = useState<Outcome>()
  const [attempt, setAttempt] = useState(0)
  const startedRef = useRef<string>(undefined)
  const roleRef = useRef<InviteRole>(undefined)

  const forgetPreview = (held: string) => {
    queryClient.removeQueries({ queryKey: [...queryKeys.stores.invitationPreview, held] })
  }

  const refuse = (held: string, refusal: AcceptRefusal) => {
    setOutcome({ token: held, kind: 'refused', refusal, role: roleRef.current })
    if (spentToken(refusal)) {
      dropInvitationToken(held)
      forgetPreview(held)
    }
  }

  const run = (held: string): boolean =>
    submit({ token: held, idempotencyKey: key.next() }, {
      onSuccess: (accepted) => {
        key.settled()
        forgetPreview(held)
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
        refuse(held, acceptRefusal(error))
      },
    })

  const begin = useEffectEvent(async (held: string, cancelled: () => boolean, decide: () => void) => {
    let preview
    try {
      preview = await queryClient.fetchQuery({ ...storesQueries.invitationPreview(client, held), staleTime: PREVIEW_FRESH_MS })
    }
    catch (error) {
      if (cancelled())
        return
      decide()
      const unknown = error instanceof ApiProblem && (error.status === 404 || error.status === 400)

      if (unknown)
        refuse(held, 'notFound')
      else if (!manual)
        setOutcome({ token: held, kind: 'previewFailed', error: error instanceof Error ? error : new Error('The invitation could not be read') })

      return
    }
    if (cancelled())
      return
    roleRef.current = preview.role
    if (preview.state === 'expired' || preview.state === 'revoked') {
      decide()
      refuse(held, preview.state)

      return
    }
    if (manual) {
      decide()

      return
    }
    if (preview.role !== 'owner') {
      decide()
      void navigate({ to: INVITATION_PATH, replace: true })

      return
    }
    const user = await queryClient.fetchQuery(sessionUserQuery).catch(() => undefined)

    if (cancelled())
      return
    decide()
    if (user === null)
      setOutcome({ token: held, kind: 'signIn' })
    else
      run(held)
  })

  useEffect(() => {
    if (!token || startedRef.current === token)
      return
    let cancelled = false
    let decided = false

    startedRef.current = token
    void begin(token, () => cancelled, () => { decided = true })

    return () => {
      cancelled = true
      if (!decided)
        startedRef.current = undefined
    }
  }, [token, attempt])

  // An answer belongs to the token it was for. The accepted token is gone from storage, so it still counts.
  const current = outcome && (token === undefined || token === outcome.token) ? outcome : undefined
  let state: AcceptState = { kind: 'none' }

  if (token)
    state = manual && !isPending ? { kind: 'ready' } : { kind: 'accepting' }

  if (current?.kind === 'accepted')
    state = { kind: 'accepted', accepted: current.accepted }
  else if (current?.kind === 'refused')
    state = { kind: 'refused', refusal: current.refusal, role: current.role }
  else if (current?.kind === 'previewFailed')
    state = { kind: 'previewFailed', error: current.error }
  else if (current?.kind === 'signIn')
    state = { kind: 'signIn' }

  const retry = () => {
    if (!token)
      return
    const failedRead = outcome?.kind === 'previewFailed'

    setOutcome(undefined)
    if (failedRead) {
      startedRef.current = undefined
      setAttempt(count => count + 1)

      return
    }
    run(token)
  }

  return { state, token, retry, accept: retry, signIn: goToSignIn }
}
