import type { MerchantCategory } from '@sk/api-contract'

/** The top-level categories, each by position. */
export function rootsOf(items: MerchantCategory[]) {
  return items.filter(item => item.parentId === null)
}

export function childrenOf(items: MerchantCategory[], id: string) {
  return items.filter(item => item.parentId === id)
}

export function siblingsOf(items: MerchantCategory[], category: MerchantCategory) {
  return items.filter(item => item.parentId === category.parentId)
}

/** Top-level categories, each followed by its sub-categories: the order the guests see. */
export function displayOrder(items: MerchantCategory[]) {
  return rootsOf(items).flatMap(root => [root, ...childrenOf(items, root.id)])
}

export function canMove(items: MerchantCategory[], category: MerchantCategory, direction: -1 | 1) {
  const siblings = siblingsOf(items, category)
  const index = siblings.findIndex(item => item.id === category.id)

  return direction === -1 ? index > 0 : index < siblings.length - 1
}

/**
 * The full sibling order after moving the sibling at `from` to `to` (a drop, an arrow key or a menu item),
 * or undefined when nothing changes. The parent never changes: moving to another parent is "Sits under".
 */
export function reorderedIds(items: MerchantCategory[], parentId: string | null, from: number, to: number) {
  const ids = items.filter(item => item.parentId === parentId).map(item => item.id)
  const [picked] = ids.splice(from, 1)

  if (picked === undefined || to < 0 || to > ids.length || from === to)
    return undefined
  ids.splice(to, 0, picked)

  return ids
}

/** The list with the siblings under `parentId` in the order of `ids`. */
export function withOrder(items: MerchantCategory[], parentId: string | null, ids: string[]) {
  const byId = new Map(items.map(item => [item.id, item]))
  const ordered = ids.map(id => byId.get(id)).filter(item => item !== undefined)
  let next = 0

  return items.map(item => (item.parentId === parentId ? ordered[next++] ?? item : item))
}

/** Search in either language; a blank query matches everything. */
export function matches(category: MerchantCategory, query: string) {
  const q = query.trim().toLowerCase()

  return !q || [category.name.en, category.name.de].some(name => name?.toLowerCase().includes(q))
}

/** Why a delete is refused (the API's 409), or null when the category can go. */
export function refusalOf(category: MerchantCategory) {
  return category.childCount > 0 || category.useCount > 0 ? { children: category.childCount, uses: category.useCount } : null
}

/** The name the merchant reads first: English, or German when English is missing. */
export function nameOf(category: MerchantCategory) {
  return category.name.en ?? category.name.de ?? ''
}
