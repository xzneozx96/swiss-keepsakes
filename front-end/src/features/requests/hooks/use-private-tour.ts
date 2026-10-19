import type { PrivateTourRequest } from '../types'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions, useDemoSelector } from '@/features/demo'

import { demoNow } from '@/features/demo/clock'
import { looksLikeEmail } from '../lib/answers'
import { mailPrivateTourRequest } from '../lib/request-mail'

export interface PrivateTourInput {
  groupSize: number
  dateFrom?: string
  /** Empty for a single day: saved as `dateFrom`. */
  dateTo?: string
  interests: string
  email: string
}

export type PrivateTourErrors = Partial<
  Record<'dates' | 'email', 'missing' | 'invalid'>
>

export type PrivateTourResult
  = { ok: true, requestId: string } | { ok: false, errors: PrivateTourErrors }

/** Group size limits (D8). */
export const GROUP_MIN = 1
export const GROUP_MAX = 50

/**
 * C22 private tour request (spec §4, D8, A1): no sign-in; group size, the first preferred
 * day and the email are required, interests are optional. The request is saved for M20;
 * the guest's own email is prefilled when signed in.
 */
export function usePrivateTour() {
  const { language } = useLocale()
  const { update } = useDemoActions()
  const guests = useDemoSelector(s => s.data.guests)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const guest = guests.find(g => g.id === signedInGuestId)

  return {
    defaultEmail: guest?.email ?? '',
    send: (input: PrivateTourInput): PrivateTourResult => {
      const email = input.email.trim()
      const errors: PrivateTourErrors = {}

      if (!input.dateFrom)
        errors.dates = 'missing'
      if (!email)
        errors.email = 'missing'
      else if (!looksLikeEmail(email))
        errors.email = 'invalid'
      if (errors.dates || errors.email)
        return { ok: false, errors }

      const dateFrom = input.dateFrom as string
      const requestId = `pt-${Date.now().toString(36)}`

      update((s) => {
        const request: PrivateTourRequest = {
          id: requestId,
          sentAt: demoNow(s.clockStartedAt).toISOString(),
          language,
          email,
          groupSize: Math.min(GROUP_MAX, Math.max(GROUP_MIN, input.groupSize)),
          dateFrom,
          dateTo: input.dateTo ?? dateFrom,
          interests: input.interests.trim(),
        }

        // N17 to the Owner and the Manager; the guest gets no email (A2).
        return mailPrivateTourRequest(
          {
            ...s,
            data: {
              ...s.data,
              privateTourRequests: [...s.data.privateTourRequests, request],
            },
          },
          request,
        )
      })

      return { ok: true, requestId }
    },
  }
}
