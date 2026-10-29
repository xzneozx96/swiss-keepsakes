import type { LabCategory } from './categories-data'
import type { CategoryOpening } from './categories-lab-app'
import type { CategoryLab } from './categories-state'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { PlusIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useIsWide } from '@/hooks/use-is-wide'
import { nameOf, refusalOf } from './categories-data'
import { CategoryTable } from './categories-desktop'
import { CategoriesPage, CategoryForm, RefusalNote } from './categories-kit'
import { CategoryDrill } from './categories-phone'

type Sheet = { mode: 'form', id: string | undefined, parentId: string | null } | { mode: 'refused', id: string } | null

/** What the table rows and the phone pages can ask for; the sheets and the confirm live here. */
export interface EditorActions {
  edit: (c: LabCategory) => void
  addSub: (parent: LabCategory) => void
  remove: (c: LabCategory) => Promise<void>
}

function openingSheet(opening: CategoryOpening, wide: boolean): Sheet {
  if (opening.state === 'add')
    return { mode: 'form', id: undefined, parentId: null }
  if (opening.state === 'edit' && opening.target)
    return { mode: 'form', id: opening.target.id, parentId: null }
  // On phones a refused delete shows on the category's page, before any tap.
  return opening.state === 'refused' && opening.target && wide ? { mode: 'refused', id: opening.target.id } : null
}

/**
 * N23, round 2: the grouped table from 1024 px, the drill-in on phones, both reordering by drag.
 * Add and edit open the app's sheet; Delete on a used category explains why it is refused (a sheet
 * from the table's ⋯ menu, the checklist on a phone page); an unused one asks first.
 */
export function CategoriesEditor({ lab, opening }: { lab: CategoryLab, opening: CategoryOpening }) {
  const wide = useIsWide()
  const [sheet, setSheet] = useState<Sheet>(() => openingSheet(opening, wide))
  const [pageId, setPageId] = useState<string | null>(() =>
    opening.state === 'page' || opening.state === 'refused' ? opening.target?.id ?? null : null)
  const { confirm, dialog } = useConfirm()
  const { items, kind } = lab
  const target = items.find(c => c.id === sheet?.id)

  const actions: EditorActions = {
    edit: c => setSheet({ mode: 'form', id: c.id, parentId: null }),
    addSub: c => setSheet({ mode: 'form', id: undefined, parentId: c.id }),
    remove: async (c) => {
      if (refusalOf(items, c)) {
        setSheet({ mode: 'refused', id: c.id })

        return
      }
      if (await confirm({ title: `Delete “${nameOf(c)}”?`, body: 'Guests stop seeing it at once. Nothing uses it, so no pin or story changes.', confirmLabel: 'Delete category' })) {
        lab.remove(c.id)
        setPageId(c.parentId)
      }
    },
  }

  return (
    <CategoriesPage
      action={(
        <Button className="min-h-11 shrink-0" onPress={() => setSheet({ mode: 'form', id: undefined, parentId: null })}>
          <PlusIcon size={18} />
          Add
        </Button>
      )}
      lab={lab}
    >
      {wide
        ? <CategoryTable actions={actions} lab={lab} />
        : <CategoryDrill actions={actions} lab={lab} pageId={pageId} onPage={setPageId} />}

      <SheetFrame
        footer={sheet?.mode === 'refused'
          ? <Button fullWidth className="min-h-11" variant="secondary" onPress={() => setSheet(null)}>Got it</Button>
          : (
              <>
                <Button fullWidth className="min-h-11" form="category-form" type="submit">{target ? 'Save' : 'Add category'}</Button>
                <Button fullWidth className="min-h-11" variant="tertiary" onPress={() => setSheet(null)}>Cancel</Button>
              </>
            )}
        isOpen={sheet !== null}
        title={sheet?.mode === 'refused'
          ? `Can’t delete “${target ? nameOf(target) : ''}” yet`
          : target ? `Edit “${nameOf(target)}”` : sheet?.parentId ? 'New sub-category' : 'New category'}
        onClose={() => setSheet(null)}
      >
        {sheet?.mode === 'refused' && target && <RefusalNote compact c={target} items={items} kind={kind} />}
        {sheet?.mode === 'form' && (
          <CategoryForm
            key={sheet.id ?? `new-${sheet.parentId}`}
            category={target}
            formId="category-form"
            items={items}
            parentId={sheet.parentId}
            onSave={(draft) => {
              lab.save(sheet.id, draft)
              setSheet(null)
            }}
          />
        )}
      </SheetFrame>
      {dialog}
    </CategoriesPage>
  )
}
