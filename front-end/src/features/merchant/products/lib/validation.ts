import type { MissingText, RequiredText, TextFieldId } from './completeness'
import type { Language } from '@/contexts/locale-context'
import type { LocalizedText } from '@/features/catalog/types'

import {
  closestLanguage,
  hasText,
  languageStatus,
  missingText,
} from './completeness'

/**
 * What a stepper action checks (M12/M13, revision 2):
 * - `step`: Next while creating. The publish rules of one step, each text field in at least
 *   one language (the one-language rule spans steps, so it waits for Publish).
 * - `draft`: Save draft, and saving a draft. A name in one language and sane numbers.
 * - `live`: saving a published record. One complete language (R02) and prices.
 * - `publish`: going from draft to published. `live` plus a photo, an option or a departure.
 */
export type Level = 'step' | 'draft' | 'live' | 'publish'

export type StepStatus = 'todo' | 'done' | 'warning' | 'error'

export interface Issue {
  tone: 'danger' | 'warning'
  text: string
}

export interface TextErrors {
  /** Required text empty in both languages. */
  any: TextFieldId[]
  /** No language is complete: this language's gaps are marked (the closer one). */
  language?: Language
}

export function textErrors(fields: RequiredText[], level: Level): TextErrors {
  if (level === 'draft')
    return { any: [] }
  const missing = missingText(fields)
  const any = [
    ...new Set(
      fields
        .filter(f => !hasText(f.text, 'en') && !hasText(f.text, 'de'))
        .map(f => f.id),
    ),
  ]

  return {
    any,
    language:
      level !== 'step' && languageStatus(missing) === 'incomplete'
        ? closestLanguage(missing)
        : undefined,
  }
}

/**
 * The error one localized field shows in `language`, or none: empty in both languages when
 * the field is required at all, or empty in the language that has to be completed.
 */
export function textFieldError(
  errors: TextErrors | undefined,
  missing: MissingText,
  id: TextFieldId,
  language: Language,
  value: LocalizedText,
  messages: { any: string, needed: (language: Language) => string },
): string | undefined {
  if (!errors)
    return undefined
  const other: Language = language === 'en' ? 'de' : 'en'

  if (hasText(value, language))
    return undefined
  if (errors.any.includes(id) && !hasText(value, other))
    return messages.any
  if (errors.language === language && missing[language].includes(id))
    return messages.needed(language)

  return undefined
}
