import type { Language } from '@sk/domain/shared'

export { isLanguage, legacyGuestTarget, pageVersionRule, resolveLandingLanguage, switchLanguagePath } from '@sk/domain/shared'
export type { VersionRule } from '@sk/domain/shared'

export function writeLanguageCookie(language: Language): void {
  document.cookie = `sk_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`
}
