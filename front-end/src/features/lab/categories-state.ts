import type { CategoryDraft, LabCategory } from './categories-data'
import type { CategoryKind } from './categories-search-params'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { moved, reordered, saved, seedCategories } from './categories-data'

/** Both lists in memory, the tab that is open, and the four edits. Nothing is stored. */
export function useCategoryLab(initialKind: CategoryKind) {
  const [lists, setLists] = useState(() => structuredClone(seedCategories))
  const [kind, setKind] = useState(initialKind)
  const [added, setAdded] = useState(0)
  const items = lists[kind]
  const update = (next: LabCategory[]) => setLists(current => ({ ...current, [kind]: next }))

  return {
    kind,
    setKind,
    items,
    save: (id: string | undefined, draft: CategoryDraft) => {
      update(saved(items, id, draft, `new-${added}`))
      setAdded(added + 1)
      toast.success(id ? 'Category saved' : 'Category added')
    },
    move: (id: string, direction: -1 | 1) => update(moved(items, id, direction)),
    reorder: (parentId: string | null, from: number, to: number) => update(reordered(items, parentId, from, to)),
    remove: (id: string) => {
      update(items.filter(c => c.id !== id))
      toast.success('Category deleted')
    },
  }
}

export type CategoryLab = ReturnType<typeof useCategoryLab>
