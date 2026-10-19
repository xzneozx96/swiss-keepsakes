import type { AdviceQuestion, AdviceQuestionSet } from '../../types'

import { useDemoActions, useDemoSelector } from '@/features/demo'

import { demoNow } from '@/features/demo/clock'
import {
  missingLanguages,
  moveQuestion,
  removeQuestion,
  upsertQuestion,
} from '../lib/question-set'

/**
 * The M19 question set editor (spec M19, outline step 15). Every change replaces the set
 * (never mutates it) and stamps `updatedAt`. An open C21 conversation keeps the copy it
 * started with, and sent requests keep their own wording, so edits reach new requests only
 * (AC18).
 */
export function useQuestionSet() {
  const { update } = useDemoActions()
  const adviceQuestions = useDemoSelector(s => s.data.adviceQuestions)
  const set = adviceQuestions

  const change = (recipe: (set: AdviceQuestionSet) => AdviceQuestionSet) =>
    update(s => ({
      ...s,
      data: {
        ...s.data,
        adviceQuestions: {
          ...recipe(s.data.adviceQuestions),
          updatedAt: demoNow(s.clockStartedAt).toISOString(),
        },
      },
    }))

  return {
    set,
    /** Questions lacking a language, for the summary warning. */
    incomplete: set.questions.filter(q => missingLanguages(q).length > 0)
      .length,
    saveQuestion: (question: AdviceQuestion) =>
      change(current => upsertQuestion(current, question)),
    removeQuestion: (id: string) =>
      change(current => removeQuestion(current, id)),
    move: (id: string, by: -1 | 1) =>
      change(current => moveQuestion(current, id, by)),
    setRecipient: (email: string) =>
      change(current => ({ ...current, recipientEmail: email })),
  }
}
