import type { ContentLanguage } from './localized.ts'

/** Which language a public read carries and why: the language asked for, the language shown, and the ones that exist. */
export interface LanguageNotice {
  language: ContentLanguage
  requestedLanguage: ContentLanguage
  fallback: boolean
  availableLanguages: ContentLanguage[]
}

/** A version exists in the requested language, else the other one, else there is nothing to show (ADR-002). */
export function pickLanguage(
  available: ContentLanguage[],
  requested: ContentLanguage,
): { language: ContentLanguage, fallback: boolean } | null {
  if (available.includes(requested))
    return { language: requested, fallback: false }

  const other = available.find(language => language !== requested)

  return other ? { language: other, fallback: true } : null
}

/** The notice for a read that has versions in `available`, or null when it has none. */
export function languageNotice(available: ContentLanguage[], requested: ContentLanguage): LanguageNotice | null {
  const choice = pickLanguage(available, requested)
  return choice && { language: choice.language, requestedLanguage: requested, fallback: choice.fallback, availableLanguages: available }
}
