import type { Localized } from '../ports.ts'
import { categorySlugBase, languagesOf, nextFreeSlug } from '@sk/domain/content'

type Language = 'en' | 'de'

// The web address of each language that has a name, made once at the first publish. A live address stays as it is,
// even when the name changes (ADR-014: a changed slug breaks the old URL). A language with no name loses its slug,
// because products_published_fields_check wants the slug and the published name to cover the same languages.
// `taken` holds the slugs of other products, for each language.
export function productSlug(input: { stored: Localized | null, name: Localized, taken: Record<Language, ReadonlySet<string>> }): Localized {
  const slug: Localized = {}
  for (const language of languagesOf(input.name)) {
    const live = input.stored?.[language]
    slug[language] = live ?? nextFreeSlug(categorySlugBase({ [language]: input.name[language] }), input.taken[language])
  }
  return slug
}
