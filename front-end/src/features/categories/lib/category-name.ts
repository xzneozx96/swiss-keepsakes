import type { MerchantCategory } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

export const OTHER: Record<Language, Language> = { en: 'de', de: 'en' }

/** The name to show in the screen language, else the other language, and what each language is missing. */
export function displayName(category: MerchantCategory, language: Language) {
  const own = category.name[language]
  const other = category.name[OTHER[language]]

  return { primary: own ?? other ?? '', secondary: own !== null ? other : null }
}
