import { looksLikeEmail } from '@sk/domain/requests'
import { useLocale } from '@/contexts/locale-context'

import { useGuests } from '@/features/account/api/queries'
import { useSubmit } from '@/features/data-client'
import { useDemoSelector } from '@/features/demo'

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
  const { submit, isPending } = useSubmit('requests', 'sendPrivateTourRequest')
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const guest = useGuests(guests => guests.find(g => g.id === signedInGuestId))

  return {
    defaultEmail: guest?.email ?? '',
    isSending: isPending,
    /**
     * Checks the input and sends it. `onSent` runs once the request is stored, so C22's sent
     * screen can show it; a tap while one is on its way returns null and does nothing.
     */
    send: (
      input: PrivateTourInput,
      onSent: (requestId: string) => void,
    ): PrivateTourResult | null => {
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

      // N17 to the Owner and the Manager; the guest gets no email (A2).
      const sent = submit(
        {
          id: requestId,
          language,
          email,
          groupSize: Math.min(GROUP_MAX, Math.max(GROUP_MIN, input.groupSize)),
          dateFrom,
          dateTo: input.dateTo ?? dateFrom,
          interests: input.interests.trim(),
        },
        { onSuccess: () => onSent(requestId) },
      )

      return sent ? { ok: true, requestId } : null
    },
  }
}
