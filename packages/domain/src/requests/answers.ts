import type { AdviceQuestion, AdviceValue } from './types'
import type { Language } from '../shared/language'

import { pickText } from '../shared/localized'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/** Upper bound of a number answer; a larger group writes it in "anything else". */
export const NUMBER_MAX = 30

/** Where a number question starts, and its lowest allowed value. */
export const numberStart = (question: AdviceQuestion) => question.min ?? 0

export function isAnswered(value: AdviceValue | undefined): boolean {
  if (value === undefined)
    return false
  if (Array.isArray(value))
    return value.length > 0

  return typeof value === 'number' || value.trim() !== ''
}

/** The answer as the guest saw it, saved with the request (AC18) and shown on review. */
export function displayAnswer(
  question: AdviceQuestion,
  value: AdviceValue | undefined,
  language: Language,
  formatDate: (iso: string) => string,
): string {
  if (!isAnswered(value))
    return ''
  const label = (id: string) =>
    pickText(question.options?.find(o => o.id === id)?.label ?? {}, language)
      .text

  switch (question.type) {
    case 'number':
      return String(value)
    case 'single':
      return label(value as string)
    case 'multi':
      return (value as string[]).map(label).join(', ')
    case 'date':
      return formatDate(value as string)
    case 'text':
      return (value as string).trim()
  }
}

export function looksLikeEmail(email: string) {
  return EMAIL_SHAPE.test(email.trim())
}
