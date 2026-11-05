import type { PublicCategory } from '@sk/api-contract'

import { subCategories, topLevelCategories } from '@/features/map/lib/categories'

/**
 * The sheet's choice is a list of category ids: a parent id covers all its sub-categories, a
 * sub-category id stands for itself. These rules keep that list in one normal form: a parent id
 * and some of its child ids are never held together, and every child ticked collapses to the parent.
 */

/** The list in the sheet's order (each parent, then its sub-categories), so the address reads the same whatever was ticked first. */
function inSheetOrder(ids: Set<string>, categories: readonly PublicCategory[]) {
  return topLevelCategories(categories).flatMap(top => [top.id, ...subCategories(categories, top.id).map(child => child.id)]).filter(id => ids.has(id))
}

/** Ticking a parent covers every child; a parent that is ticked is cleared, an indeterminate or empty one is ticked. */
export function toggleParent(chosen: readonly string[], parentId: string, categories: readonly PublicCategory[]) {
  const next = new Set(chosen)
  const children = subCategories(categories, parentId).map(child => child.id)

  children.forEach(id => next.delete(id))
  if (chosen.includes(parentId))
    next.delete(parentId)
  else
    next.add(parentId)

  return inSheetOrder(next, categories)
}

/** The sub-categories of a parent that read as ticked: all of them under a ticked parent, else the ones chosen. */
export function tickedChildren(chosen: readonly string[], parentId: string, categories: readonly PublicCategory[]) {
  const children = subCategories(categories, parentId).map(child => child.id)

  return chosen.includes(parentId) ? children : children.filter(id => chosen.includes(id))
}

/** The choice once a parent's sub-categories are ticked as `ticked`: all of them collapse to the parent, none clear it. */
export function setChildren(chosen: readonly string[], parentId: string, ticked: readonly string[], categories: readonly PublicCategory[]) {
  const next = new Set(chosen)
  const children = subCategories(categories, parentId).map(child => child.id)

  next.delete(parentId)
  children.forEach(id => next.delete(id))
  if (ticked.length === children.length)
    next.add(parentId)
  else
    ticked.forEach(id => next.add(id))

  return inSheetOrder(next, categories)
}
