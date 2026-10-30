import type { ContentLanguage, Localized, Pin } from '@sk/domain/content'
import type { PinRepository } from '../ports.ts'
import { languagesOf, nextFreeSlug, pinSlugBase } from '@sk/domain/content'

// The slugs other pins hold, for each language, platform-wide (places_slug_en_key and places_slug_de_key are not per store).
export type TakenSlugs = Record<ContentLanguage, ReadonlySet<string>>

export interface PinSlugInput {
  /** The slug stored on the pin, none for a new pin. */
  stored: Localized | null
  /** The title the slug follows: the new draft title, else the one stored. */
  title: Localized
  /** The title before this change, to tell which language changed. Empty for a new pin. */
  previousTitle: Localized
  /** True once the pin was published or hidden: its web addresses are public and locked (ADR-014). */
  hasBeenPublished: boolean
  /** The slugs of the other pins. */
  taken: TakenSlugs
}

// Live or hidden: the pin has been public, so its slugs are locked.
export const pinHasBeenPublished = (pin: Pick<Pin, 'status' | 'published'>): boolean => pin.status !== 'draft' || pin.published !== null

const trimmed = (text: Localized, language: ContentLanguage) => text[language]?.trim() ?? ''

// The languages of a draft that need a slug made. Before the first publish a slug follows its title, so a language
// whose title changed gets a new one; a language that has a title and no slug gets one at any time. A pin that has
// been published keeps every slug it has, even when the title changes.
export function languagesToSlug({ stored, title, previousTitle, hasBeenPublished }: Omit<PinSlugInput, 'taken'>): ContentLanguage[] {
  return languagesOf(title).filter(language =>
    stored?.[language] === undefined || (!hasBeenPublished && trimmed(title, language) !== trimmed(previousTitle, language)))
}

// The slug of a pin: what is stored for each language that has a title, with a slug made for each language in
// `languagesToSlug`. A language with no title has no slug, so the slug keeps covering the title
// (places_published_fields_check). Each new slug is the next free one, so a title another pin uses gets `-2`, `-3`.
// `taken` must not hold this pin's own slugs, so an unchanged title keeps its slug. Null when no language is left
// (the column holds a map with a key, or null).
export function pinSlug(input: PinSlugInput): Localized | null {
  const { stored, title, taken } = input
  const made = new Set(languagesToSlug(input))
  const slug: Localized = {}
  for (const language of languagesOf(title)) {
    const live = stored?.[language]
    slug[language] = !made.has(language) && live !== undefined ? live : nextFreeSlug(pinSlugBase(trimmed(title, language)), taken[language])
  }
  return Object.keys(slug).length > 0 ? slug : null
}

// `pinSlug` with the slugs of the other pins read under the platform-wide lock. A write that has nothing to make takes no lock.
export async function pinSlugFor<T>(pins: PinRepository<T>, tx: T, input: Omit<PinSlugInput, 'taken'> & { pinId?: string }): Promise<Localized | null> {
  const none: TakenSlugs = { en: new Set(), de: new Set() }
  if (languagesToSlug(input).length === 0)
    return pinSlug({ ...input, taken: none })
  await pins.lockSlugs(tx)
  return pinSlug({ ...input, taken: { en: await pins.slugsTaken(tx, 'en', input.pinId), de: await pins.slugsTaken(tx, 'de', input.pinId) } })
}
