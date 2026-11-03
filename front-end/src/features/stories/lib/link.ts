import type { StoryLanguage } from './search-params'

import { slugify } from '@sk/domain/shared'

/** The public path of a story in one language; the slug is not set yet before the first save. */
export function linkPath(language: StoryLanguage, slug: string | null): string {
  return `/${language}/stories/${slug ?? '…'}`
}

/** What the "Use" button offers: the other language's link, else one made from the title. Null when there is nothing new. */
export function slugSuggestion({ otherSlug, title, current }: { otherSlug: string | null, title: string, current: string | null }): string | null {
  const suggestion = otherSlug !== null && otherSlug.trim() !== '' ? otherSlug : slugify(title)

  return suggestion === '' || suggestion === current ? null : suggestion
}

/** The link as saved. Applied when the field is left, never per keystroke (a trailing dash must be typeable). '' clears. */
export function normalizeSlug(raw: string): string {
  return slugify(raw.trim())
}
