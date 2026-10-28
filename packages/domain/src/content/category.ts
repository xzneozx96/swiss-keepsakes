import { slugify } from '../shared/slug.ts'
import type { Localized } from './localized.ts'
import { contentLanguages } from './localized.ts'

/** Trim each language and drop blank ones; `undefined` when no language is left. */
export function normalizeCategoryName(input: { en?: string | null, de?: string | null }): Localized | undefined {
  const name: Localized = {}
  for (const k of contentLanguages) {
    const text = input[k]?.trim() ?? ''
    if (text !== '') name[k] = text
  }
  return Object.keys(name).length > 0 ? name : undefined
}

/** The slug is made once from the EN name, else the DE name. */
export function categorySlugBase(name: Localized): string {
  return slugify(name.en?.trim() || name.de?.trim() || '') || 'category'
}

export function nextFreeSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export type NestingVerdict = 'ok' | 'too-deep' | 'has-children' | 'own-parent'

/** One level only: a sub-category has no children, and a category with children cannot become a sub. */
export function checkNesting(input: {
  category: { id: string, parentId: string | null, childCount: number }
  target: { id: string, parentId: string | null } | null
}): NestingVerdict {
  const { category, target } = input
  if (target === null) return 'ok'
  if (target.id === category.id) return 'own-parent'
  if (category.parentId === target.id) return 'ok'
  if (target.parentId !== null) return 'too-deep'
  if (category.childCount > 0) return 'has-children'
  return 'ok'
}
