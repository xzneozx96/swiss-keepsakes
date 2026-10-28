import type { ContentLanguage } from '@sk/domain/content'

// TODO(E3.11): reuse `pageVersionRule` from packages/domain/src/shared once E3.11 merges.
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
