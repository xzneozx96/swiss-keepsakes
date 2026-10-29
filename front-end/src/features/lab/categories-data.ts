import type { CategoryKind } from './categories-search-params'

/**
 * Lab data for the category editor (N23). Same shape as the API's merchant category: names per
 * language (either may be missing), a parent (one level), the order of the array among siblings,
 * and how many pins (map) or stories (blog) use it. Nothing is stored.
 */
export interface LabCategory {
  id: string
  en: string | null
  de: string | null
  parentId: string | null
  uses: number
}

export interface CategoryDraft {
  en: string
  de: string
  parentId: string | null
}

function cat(id: string, en: string | null, de: string | null, uses: number, parentId: string | null = null): LabCategory {
  return { id, en, de, parentId, uses }
}

/** Lucerne lists with the edge cases: EN only, DE only, a long German name, 0 and 132 uses, a parent with three children. */
export const seedCategories: Record<CategoryKind, LabCategory[]> = {
  map: [
    cat('sights', 'Sights', 'Sehenswürdigkeiten', 14),
    cat('old-town', 'Old Town', 'Altstadt', 6, 'sights'),
    cat('views', 'Viewpoints', 'Aussichtspunkte', 3, 'sights'),
    cat('bridges', 'Bridges and towers', 'Brücken und Türme', 0, 'sights'),
    cat('food', 'Food and drink', 'Essen und Trinken', 9),
    cat('cafes', 'Cafés', 'Cafés', 4, 'food'),
    cat('fondue', 'Fondue and raclette', null, 0, 'food'),
    cat('chocolate', 'Chocolate', 'Schokolade', 2, 'food'),
    cat('essentials', 'Free essentials', 'Kostenlos und nützlich', 132),
    cat('museums', 'Museums', 'Museen', 5),
    cat('walks', 'Walks', 'Spaziergänge', 0),
    cat('advent', null, 'Weihnachtsmärkte und Adventsveranstaltungen in der Altstadt', 0),
  ],
  blog: [
    cat('history', 'Lucerne history', 'Luzerner Geschichte', 7),
    cat('legends', 'Legends and myths', 'Sagen und Legenden', 3, 'history'),
    cat('swiss', 'Swiss history', 'Schweizer Geschichte', 2, 'history'),
    cat('food-stories', 'Food stories', 'Kulinarische Geschichten', 4),
    cat('trips', 'Day trips', 'Ausflüge', 2),
    cat('pilatus', 'Mount Pilatus', 'Pilatus', 1, 'trips'),
    cat('rigi', 'Rigi', null, 0, 'trips'),
    cat('tips', 'Practical tips', 'Praktische Tipps', 5),
    cat('makers', null, 'Handwerk und Macher', 0),
  ],
}

/** Which category each frame state opens: one to edit, one whose delete is refused. */
export const labTargets: Record<CategoryKind, { edit: string, refused: string }> = {
  map: { edit: 'fondue', refused: 'sights' },
  blog: { edit: 'rigi', refused: 'history' },
}

export const usedBy = {
  map: { one: 'pin', many: 'pins' },
  blog: { one: 'story', many: 'stories' },
} as const

export function usesLabel(kind: CategoryKind, n: number) {
  return `${n} ${n === 1 ? usedBy[kind].one : usedBy[kind].many}`
}

/** The name the merchant reads first: English, or German when English is missing. */
export function nameOf(c: LabCategory) {
  return c.en ?? c.de ?? ''
}

export function roots(items: LabCategory[]) {
  return items.filter(c => c.parentId === null)
}

export function childrenOf(items: LabCategory[], id: string) {
  return items.filter(c => c.parentId === id)
}

export function siblingsOf(items: LabCategory[], c: LabCategory) {
  return items.filter(s => s.parentId === c.parentId)
}

/** Position among siblings, 1-based, and how many siblings there are. */
export function positionOf(items: LabCategory[], c: LabCategory) {
  const siblings = siblingsOf(items, c)

  return { index: siblings.findIndex(s => s.id === c.id) + 1, of: siblings.length }
}

export function canMove(items: LabCategory[], c: LabCategory, direction: -1 | 1) {
  const { index, of } = positionOf(items, c)

  return direction === -1 ? index > 1 : index < of
}

/** Swaps a category with its neighbour among its siblings. */
export function moved(items: LabCategory[], id: string, direction: -1 | 1) {
  const c = items.find(item => item.id === id)

  if (!c || !canMove(items, c, direction))
    return items
  const siblings = siblingsOf(items, c)
  const other = siblings[siblings.findIndex(s => s.id === id) + direction]!
  const a = items.indexOf(c)
  const b = items.indexOf(other)
  const next = [...items]

  next[a] = other
  next[b] = c

  return next
}

export interface Refusal {
  children: LabCategory[]
  uses: number
}

/** Why a delete is refused (AC-4), or null when the category can go. */
export function refusalOf(items: LabCategory[], c: LabCategory): Refusal | null {
  const children = childrenOf(items, c.id)

  return children.length || c.uses ? { children, uses: c.uses } : null
}

/**
 * The parents a category may move under (AC-5): top-level categories other than itself. Null when
 * it has sub-categories, because then it must stay at the top.
 */
export function parentChoices(items: LabCategory[], c: LabCategory | undefined) {
  if (c && childrenOf(items, c.id).length)
    return null

  return roots(items).filter(r => r.id !== c?.id)
}

export function draftOf(c: LabCategory | undefined, parentId: string | null = null): CategoryDraft {
  return { en: c?.en ?? '', de: c?.de ?? '', parentId: c ? c.parentId : parentId }
}

/** AC-3: a blank name counts as missing, and one of the two is required. */
export function nameMissing(draft: CategoryDraft) {
  return !draft.en.trim() && !draft.de.trim()
}

/** Saves a draft: a new category goes last among its siblings, a moved one last under its new parent. */
export function saved(items: LabCategory[], id: string | undefined, draft: CategoryDraft, newId: string) {
  const fields = { en: draft.en.trim() || null, de: draft.de.trim() || null, parentId: draft.parentId }
  const current = items.find(c => c.id === id)

  if (!current)
    return [...items, { id: newId, uses: 0, ...fields }]
  const next = { ...current, ...fields }

  return current.parentId === draft.parentId
    ? items.map(c => (c.id === id ? next : c))
    : [...items.filter(c => c.id !== id), next]
}

/** Top-level categories, each followed by its sub-categories: the order the guests see. */
export function displayOrder(items: LabCategory[]) {
  return roots(items).flatMap(r => [r, ...childrenOf(items, r.id)])
}
