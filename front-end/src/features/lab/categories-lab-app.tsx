import type { LabCategory } from './categories-data'
import type { CategoriesLabSearch, CategoryLabState } from './categories-search-params'

import { labTargets, seedCategories } from './categories-data'
import { OutlineOption } from './categories-option-a'
import { DrillOption } from './categories-option-b'
import { TableOption } from './categories-option-c'
import { useCategoryLab } from './categories-state'

/** The state a frame opens in, from its address: the list, a category's form, or its refused delete. */
export interface CategoryOpening {
  state: CategoryLabState
  /** The category to edit or to try to delete; none for an empty Add form. */
  target: LabCategory | undefined
}

const closed: CategoryOpening = { state: 'list', target: undefined }

const OPTIONS = { A: OutlineOption, B: DrillOption, C: TableOption }

/**
 * What one lab frame shows: one option of N23 on both lists, kept in memory. Switching the list
 * starts that option fresh on it; the opening state applies to the list in the address only.
 */
export function CategoriesLabApp({ search }: { search: CategoriesLabSearch }) {
  const lab = useCategoryLab(search.kind)
  const Option = OPTIONS[search.option]
  const targetId = search.state === 'edit' ? labTargets[search.kind].edit : labTargets[search.kind].refused
  const opening: CategoryOpening = lab.kind === search.kind && search.state !== 'list'
    ? { state: search.state, target: seedCategories[search.kind].find(c => c.id === targetId) }
    : closed

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background">
      <Option key={lab.kind} lab={lab} opening={opening} />
    </div>
  )
}
