import type { Language } from '@sk/domain/shared'
import type { PageType } from './closed-values'
import { isLanguage } from '@/lib/language-routing'

const TRAILING_SLASHES = /\/+$/

function segmentsOf(pathname: string): string[] {
  return pathname.toLowerCase().replace(TRAILING_SLASHES, '').split('/').filter(Boolean)
}

/** The language segment of a guest path (`/de/map`), or undefined on a path without one. */
export function languageOf(pathname: string): Language | undefined {
  const [first] = segmentsOf(pathname)

  return isLanguage(first) ? first : undefined
}

const LIST_PAGES: Record<string, { list: PageType, item: PageType }> = {
  stories: { list: 'stories', item: 'story' },
  tours: { list: 'tours', item: 'tour' },
  gifts: { list: 'keepsakes', item: 'keepsake' },
}

/**
 * The page type of a guest path (R6, ADR-032): the guest routes live under `/:lang`. A path has no id in it (the address names a
 * slug), so the page type is all the page view carries. Anything else, including a path without a language, is `other`.
 */
export function pageTypeOf(pathname: string): PageType {
  const [lang, section, slug, ...rest] = segmentsOf(pathname)

  if (!isLanguage(lang) || rest.length > 0)
    return 'other'
  if (section === undefined)
    return 'home'
  if (section === 'map' && slug === undefined)
    return 'map'

  const pages = LIST_PAGES[section]

  if (!pages)
    return 'other'

  return slug === undefined ? pages.list : pages.item
}
