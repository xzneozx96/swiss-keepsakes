import type { LabCategory } from './categories-data'
import type { CategoriesLabSearch, CategoryLabState } from './categories-search-params'

import { labTargets, seedCategories } from './categories-data'
import { CategoriesEditor } from './categories-editor'
import { useCategoryLab } from './categories-state'

/** The state a frame opens in, from its address. */
export interface CategoryOpening {
  state: CategoryLabState
  /** The category to show, edit or try to delete; none for the list or an empty Add form. */
  target: LabCategory | undefined
}

const closed: CategoryOpening = { state: 'list', target: undefined }

/**
 * What one lab frame shows: N23 on both lists, kept in memory. Switching the list starts the
 * editor fresh on it; the opening state applies to the list in the address only.
 */
export function CategoriesLabApp({ search }: { search: CategoriesLabSearch }) {
  const lab = useCategoryLab(search.kind)
  const { state } = search
  const targetId = state === 'page' || state === 'edit' || state === 'refused' ? labTargets[search.kind][state] : undefined
  const opening: CategoryOpening = lab.kind === search.kind && state !== 'list'
    ? { state, target: seedCategories[search.kind].find(c => c.id === targetId) }
    : closed

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <CategoriesEditor key={lab.kind} lab={lab} opening={opening} />
    </div>
  )
}
