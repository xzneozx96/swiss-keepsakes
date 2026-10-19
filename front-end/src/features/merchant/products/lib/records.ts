import type { LocalizedText, ProductStory } from '@/features/catalog/types'
import type { LocalizedRich } from '@/lib/rich-text'

import { isEmptyDoc } from '@/lib/rich-text'

import { slugify } from '@/lib/slug'
import { cleanText, hasText, LANGUAGES } from './completeness'

/** A slug from the name (English first), unique among `taken`; set once, at the first save. */
export function uniqueSlug(
  name: LocalizedText,
  taken: Iterable<string>,
  fallback: string,
): string {
  const used = new Set(taken)
  const base = slugify(name.en ?? name.de ?? '') || fallback
  let slug = base

  for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`

  return slug
}

/** A new record's id: the kind and the time, so it sorts after the seeded ones. */
export function newId(kind: string) {
  return `${kind}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

export function hasAnyText(text: LocalizedText) {
  return LANGUAGES.some(language => hasText(text, language))
}

/** The long story as stored: none when both the title and every body are empty. */
export function toStory(
  title: LocalizedText,
  body: LocalizedRich,
): ProductStory | undefined {
  const kept: LocalizedRich = {}

  for (const language of LANGUAGES) {
    const doc = body[language]

    if (doc && !isEmptyDoc(doc))
      kept[language] = doc
  }

  return Object.keys(kept).length || hasAnyText(title)
    ? { title: cleanText(title), body: kept }
    : undefined
}

/** A story body exists in some language while no language has its title. */
export function storyNeedsTitle(title: LocalizedText, body: LocalizedRich) {
  return (
    LANGUAGES.some(l => body[l] && !isEmptyDoc(body[l])) && !hasAnyText(title)
  )
}
