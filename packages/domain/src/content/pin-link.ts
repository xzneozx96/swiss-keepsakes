import type { Language } from '../shared/language.ts'

import { isSafeLinkHref } from './body.ts'

// The package builds with lib ES2022 only. Every runtime provides encodeURIComponent.
declare function encodeURIComponent(value: string): string

/**
 * Where a link to a pin goes (ADR-011): the pin's website, else its map page, else nowhere.
 * `null` means draw plain text. An unpublished pin never links.
 */
export function pinLinkHref(
  pin: { published: boolean, website: string | null, slug: string | null },
  language: Language,
): string | null {
  if (!pin.published) return null
  if (pin.website && isSafeLinkHref(pin.website)) return pin.website
  if (pin.slug) return `/${language}/map?place=${encodeURIComponent(pin.slug)}`
  return null
}
