import type { AdviceQuestion, AdviceQuestionSet } from '../../types'
import type { Language } from '@/contexts/locale-context'

export const LANGUAGES: Language[] = ['en', 'de']

export function isChoice(q: Pick<AdviceQuestion, 'type'>) {
  return q.type === 'single' || q.type === 'multi'
}

const blank = (text?: string) => !text?.trim()

/**
 * Languages a question lacks (D7, AC30): its own text, or any option label of a choice
 * question. C21 then shows the other language with a notice; M19 warns.
 */
export function missingLanguages(q: AdviceQuestion): Language[] {
  return LANGUAGES.filter(
    l =>
      blank(q.text[l])
      || (isChoice(q) && (q.options ?? []).some(o => blank(o.label[l]))),
  )
}

let sequence = 0

/** A fresh id for a question or option; never one a removed item had. */
export function newId(prefix: 'q' | 'o') {
  return `${prefix}-${Date.now().toString(36)}${(sequence++).toString(36)}`
}

/** Adds the question at the end, or replaces the one with its id in place. */
export function upsertQuestion(
  set: AdviceQuestionSet,
  question: AdviceQuestion,
): AdviceQuestionSet {
  const exists = set.questions.some(q => q.id === question.id)

  return {
    ...set,
    questions: exists
      ? set.questions.map(q => (q.id === question.id ? question : q))
      : [...set.questions, question],
  }
}

export function removeQuestion(
  set: AdviceQuestionSet,
  id: string,
): AdviceQuestionSet {
  return { ...set, questions: set.questions.filter(q => q.id !== id) }
}

/** Swaps the question with its neighbour; a move past either end changes nothing. */
export function moveQuestion(
  set: AdviceQuestionSet,
  id: string,
  by: -1 | 1,
): AdviceQuestionSet {
  const from = set.questions.findIndex(q => q.id === id)
  const to = from + by

  if (from < 0 || to < 0 || to >= set.questions.length)
    return set
  const questions = [...set.questions];

  [questions[from], questions[to]] = [questions[to], questions[from]]

  return { ...set, questions }
}
