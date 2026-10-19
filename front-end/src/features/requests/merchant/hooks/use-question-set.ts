import type { AdviceQuestion } from '@sk/domain/requests'

import { useCommand } from '@/features/data-client'
import { useAdviceQuestions } from '@/features/requests/api/queries'
import { missingLanguages } from '../lib/question-set'

/**
 * The M19 question set editor (spec M19, outline step 15). Every change is a command on the
 * latest set, so two quick taps both land; it replaces the set and stamps `updatedAt`. An open
 * C21 conversation keeps the copy it started with, and sent requests keep their own wording, so
 * edits reach new requests only (AC18).
 */
export function useQuestionSet() {
  const { mutate: saveQuestion } = useCommand('requests', 'saveQuestion')
  const { mutate: removeQuestion } = useCommand('requests', 'removeQuestion')
  const { mutate: moveQuestion } = useCommand('requests', 'moveQuestion')
  const { mutate: setRecipient } = useCommand('requests', 'setRecipient')
  const set = useAdviceQuestions()

  return {
    set,
    /** Questions lacking a language, for the summary warning. */
    incomplete: set.questions.filter(q => missingLanguages(q).length > 0)
      .length,
    saveQuestion: (question: AdviceQuestion) => saveQuestion(question),
    removeQuestion: (id: string) => removeQuestion({ id }),
    move: (id: string, by: -1 | 1) => moveQuestion({ id, by }),
    setRecipient: (email: string) => setRecipient({ email }),
  }
}
