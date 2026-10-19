import type {
  AdviceDraft,
  AdviceQuestion,
  AdviceValue,
} from '@sk/domain/requests'

import { displayAnswer, isAnswered, looksLikeEmail } from '@sk/domain/requests'
import { calendarDay, formatDate, pickText } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { queryKeys, useCommand, useDataClient } from '@/features/data-client'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useAdviceQuestions } from '@/features/requests/api/queries'

export type SendResult
  = | { ok: true, requestId: string }
    | { ok: false, reason: 'email-missing' | 'email-invalid' }

/**
 * C21 trip assistant (spec §4.10, R19, AC18, AC34, R08). The guest's draft keeps the question set it
 * started with, so the shop's edits apply to new requests only, and survives a refresh.
 * Until the guest answers anything, the draft is the shop's current set, not yet stored.
 * Sending needs only an email, never a sign-in; the request saves each question's wording,
 * its language and the answer exactly as shown.
 */
export function useAdvice() {
  const { language, intlLocale } = useLocale()
  const { update } = useDemoActions()
  const client = useDataClient()
  const { mutateAsync: sendAdviceRequest } = useCommand(
    client.requests.sendAdviceRequest,
    [queryKeys.requests.adviceRequests, queryKeys.notifications.mail],
  )
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const adviceDraft = useDemoSelector(s => s.data.adviceDraft)
  const adviceQuestions = useAdviceQuestions()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const guest = useGuests(guests => guests.find(g => g.id === signedInGuestId))

  const draft: AdviceDraft = adviceDraft ?? {
    set: adviceQuestions,
    step: 0,
    values: {},
    email: guest?.email ?? '',
    startedAt: demoNow(clockStartedAt).toISOString(),
  }
  const questions = draft.set.questions
  // Steps: one per question, then the email, then the summary card.
  const emailStep = questions.length
  const summaryStep = questions.length + 1

  // Merges into the stored draft, so two saves in one handler both land.
  const save = (patch: Partial<AdviceDraft>) =>
    update(s => ({
      ...s,
      data: {
        ...s.data,
        adviceDraft: { ...(s.data.adviceDraft ?? draft), ...patch },
      },
    }))

  const questionText = (q: AdviceQuestion) => pickText(q.text, language)
  const answerText = (q: AdviceQuestion) =>
    displayAnswer(q, draft.values[q.id], language, iso =>
      formatDate(calendarDay(iso), intlLocale))

  return {
    questions,
    step: Math.min(draft.step, summaryStep),
    emailStep,
    summaryStep,
    values: draft.values,
    email: draft.email,
    questionText,
    answerText,
    setValue: (id: string, value: AdviceValue | undefined) =>
      update((s) => {
        const current = s.data.adviceDraft ?? draft
        const values = { ...current.values }

        if (value === undefined)
          delete values[id]
        else values[id] = value

        return {
          ...s,
          data: { ...s.data, adviceDraft: { ...current, values } },
        }
      }),
    goTo: (step: number) => save({ step }),
    setEmail: (email: string) => save({ email }),
    canLeave: (q: AdviceQuestion) =>
      !q.required || isAnswered(draft.values[q.id]),
    /** Resolves once the request is stored, so the sent screen can show it. */
    send: async (): Promise<SendResult> => {
      const email = draft.email.trim()

      if (!email)
        return { ok: false, reason: 'email-missing' }
      if (!looksLikeEmail(email))
        return { ok: false, reason: 'email-invalid' }
      const requestId = `adv-${Date.now().toString(36)}`

      await sendAdviceRequest({
        id: requestId,
        language,
        email,
        answers: questions
          .filter(q => isAnswered(draft.values[q.id]))
          .map((q) => {
            const shown = questionText(q)

            return {
              questionId: q.id,
              question: shown.text,
              questionLanguage: shown.language,
              answer: answerText(q),
            }
          }),
      })
      update(s => ({ ...s, data: { ...s.data, adviceDraft: undefined } }))

      return { ok: true, requestId }
    },
  }
}
