import type { Localized } from '@sk/domain/content'
import { languagesOf } from '@sk/domain/content'

export interface PublishSlugInput {
  /** The slug stored on the item. */
  stored: Localized | null
  /** The slug in the publish body, if any. */
  body: Localized | undefined
  /** The title that goes live. */
  title: Localized
  /** True once the item has been live (published or hidden), so its web addresses are public. */
  hasBeenPublished: boolean
}

export type PublishSlugResult = { ok: true, slug: Localized } | { ok: false, reason: 'slug-conflict' }

// The slug that goes live with the text. On an item that was never published the body wins for the languages it
// names, and the stored slug keeps the rest. On a live item a body slug that differs from the stored one is refused
// (a live web address is renamed by a save, not a publish); an equal one is fine and one for a language with no stored
// slug fills it. A slug for a language with no title is dropped, so on a live item a language that loses its title
// loses its slug and the slug keeps covering the title (places_published_fields_check, tours_published_fields_check). A never-published item keeps
// its stored slug as it is, and a slug that misses a title language is a gap.
export function mergePublishSlug({ stored, body, title, hasBeenPublished }: PublishSlugInput): PublishSlugResult {
  if (hasBeenPublished) {
    for (const language of languagesOf(body)) {
      const live = stored?.[language]
      if (live !== undefined && live !== body![language])
        return { ok: false, reason: 'slug-conflict' }
    }
  }
  const merged: Localized = hasBeenPublished ? { ...body, ...stored } : { ...stored, ...body }
  const languages = languagesOf(title)
  if (languages.length === 0)
    return { ok: true, slug: merged } // no title: the publish is refused for it, and the slug is not what to report
  const slug: Localized = {}
  for (const language of languages) {
    if (merged[language] !== undefined)
      slug[language] = merged[language]
  }
  if (!hasBeenPublished) {
    for (const language of languagesOf(stored)) {
      if (slug[language] === undefined)
        slug[language] = stored![language]
    }
  }
  return { ok: true, slug }
}
