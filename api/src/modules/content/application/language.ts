import type { ContentLanguage } from '@sk/domain/content'

// Not `pageVersionRule` (packages/domain/src/shared/language-routing.ts): the API only compiles src/identity, src/content and shared/language.ts (tsconfig.build.json), so reusing it needs a package build change.
// A version exists in the requested language, else the other one, else there is nothing to show (ADR-002).
export function pickLanguage(
  available: ContentLanguage[],
  requested: ContentLanguage,
): { language: ContentLanguage, fallback: boolean } | null {
  if (available.includes(requested))
    return { language: requested, fallback: false }

  const other = available.find(language => language !== requested)

  return other ? { language: other, fallback: true } : null
}
