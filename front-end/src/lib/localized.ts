import type { Language } from '@/contexts/locale-context'

/** Merchant-written text in the requested language, or the version that exists (R02). */
export interface PickedText {
  text: string
  /** Language the text is actually in. */
  language: Language
  /** True when the requested language is missing and another one is shown. */
  isFallback: boolean
}

const fallbackOrder: Language[] = ['en', 'de']

export function pickText(
  text: Partial<Record<Language, string>>,
  language: Language,
): PickedText {
  const exact = text[language]

  if (exact)
    return { text: exact, language, isFallback: false }

  for (const other of fallbackOrder) {
    const value = text[other]

    if (value)
      return { text: value, language: other, isFallback: true }
  }

  return { text: '', language, isFallback: true }
}
