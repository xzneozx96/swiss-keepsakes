import type { MerchantCategory } from '@sk/api-contract'
import type { StoryLanguage } from './search-params'

import { childrenOf, matches, rootsOf } from '@/features/categories/lib/category-tree'

/** The contract's limit on the blog categories of one story (`categoryIds`, `idList(20)`). */
export const MAX_STORY_CATEGORIES = 20

const parentOf = (id: string, all: MerchantCategory[]) => all.find(item => item.id === id)?.parentId ?? null

/** Parents the story is in only through a chosen sub-category: shown as included, never stored (ADR-030). */
export function includedParents(selected: string[], all: MerchantCategory[]) {
  return [...new Set(selected.map(id => parentOf(id, all)).filter(parent => parent !== null))]
}

/**
 * Picks or drops one category (design 6.1, the five rules): a chosen one is dropped; a sub-category replaces its parent;
 * a parent replaces its chosen sub-categories; a parent never selects its children. Past `max` nothing is added.
 */
export function toggleCategory(selected: string[], id: string, all: MerchantCategory[], max = MAX_STORY_CATEGORIES) {
  if (selected.includes(id))
    return selected.filter(chosen => chosen !== id)
  const parent = parentOf(id, all)
  const kept = parent ? selected.filter(chosen => chosen !== parent) : selected.filter(chosen => parentOf(chosen, all) !== id)

  return kept.length >= max ? selected : [...kept, id]
}

/** Parents in order, each followed by its sub-categories; a match on a sub-category keeps its parent, a match on a parent shows all its sub-categories. */
export function visibleCategories(all: MerchantCategory[], query: string) {
  return rootsOf(all).flatMap((parent) => {
    const children = childrenOf(all, parent.id)
    const shown = matches(parent, query) ? children : children.filter(child => matches(child, query))

    return matches(parent, query) || shown.length > 0 ? [parent, ...shown] : []
  })
}

/** The name in the open language, else the other one. */
export function categoryLabel(category: MerchantCategory, language: StoryLanguage) {
  return category.name[language] ?? category.name[language === 'en' ? 'de' : 'en'] ?? ''
}
