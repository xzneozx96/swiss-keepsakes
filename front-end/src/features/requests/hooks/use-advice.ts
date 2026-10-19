import type {
  AdviceDraft,
  AdviceQuestion,
  AdviceRequest,
  AdviceValue,
} from '@sk/domain/requests'

import { displayAnswer, isAnswered, looksLikeEmail } from '@sk/domain/requests'
import { calendarDay, formatDate, pickText } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { mailAdviceRequest } from '../lib/request-mail'

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
  const clockStartedAt = useDemoSelector(s => s.clockStartedAt)
  const adviceDraft = useDemoSelector(s => s.data.adviceDraft)
  const adviceQuestions = useDemoSelector(s => s.data.adviceQuestions)
  const guests = useDemoSelector(s => s.data.guests)
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const guest = guests.find(g => g.id === signedInGuestId)

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
    send: (): SendResult => {
      const email = draft.email.trim()

      if (!email)
        return { ok: false, reason: 'email-missing' }
      if (!looksLikeEmail(email))
        return { ok: false, reason: 'email-invalid' }
      const requestId = `adv-${Date.now().toString(36)}`

      update((s) => {
        const request: AdviceRequest = {
          id: requestId,
          sentAt: demoNow(s.clockStartedAt).toISOString(),
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
        }

        // N16 goes to the shop's current request address, even for a draft begun earlier.
        return mailAdviceRequest(
          {
            ...s,
            data: {
              ...s.data,
              adviceDraft: undefined,
              adviceRequests: [...s.data.adviceRequests, request],
            },
          },
          request,
          s.data.adviceQuestions.recipientEmail,
        )
      })

      return { ok: true, requestId }
    },
  }
}
