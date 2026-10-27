import type { Language } from '../shared/language.ts'

export const contentLanguages = ['en', 'de'] as const satisfies readonly Language[]
export type ContentLanguage = typeof contentLanguages[number]

export const stayTags = ['short_stay', 'multi_day', 'both'] as const
export type StayTag = typeof stayTags[number]

export const interestCodes = ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes'] as const
export type InterestCode = typeof interestCodes[number]

/** What stops a draft from being published; the editor shows one line per gap. */
export type PublishGap = 'title' | 'location' | 'slug' | 'pdf'

export interface Localized { en?: string, de?: string }

/** Languages that carry text, sorted. Blank or whitespace-only text does not count. */
export function languagesOf(l: Localized | null | undefined): ContentLanguage[] {
  if (!l) return []
  return contentLanguages.filter(k => (l[k]?.trim() ?? '') !== '').sort()
}

export function hasText(l: Localized | null | undefined): boolean {
  return languagesOf(l).length > 0
}

/** The database CHECK demands the slug and the title cover the same languages. Callers skip it when the title is blank, so only the title gap shows. */
export function slugCoversTitle(slug: Localized | null | undefined, title: Localized): boolean {
  const slugLanguages = languagesOf(slug)
  const titleLanguages = languagesOf(title)
  return slugLanguages.length > 0
    && slugLanguages.length === titleLanguages.length
    && slugLanguages.every((k, i) => k === titleLanguages[i])
}
