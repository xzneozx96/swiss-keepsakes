import type { Language } from '@sk/domain/shared'

import { LANGUAGE_COOKIE } from '@sk/domain/shared'

export { isLanguage, LANGUAGE_COOKIE, legacyGuestTarget, pageVersionRule, resolveLandingLanguage, switchLanguagePath } from '@sk/domain/shared'
export type { VersionRule } from '@sk/domain/shared'

export function writeLanguageCookie(language: Language): void {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`
}
