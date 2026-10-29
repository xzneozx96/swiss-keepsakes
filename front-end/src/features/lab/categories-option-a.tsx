import type { LabCategory } from './categories-data'
import type { CategoryOpening } from './categories-lab-app'
import type { CategoryLab } from './categories-state'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { canMove, childrenOf, nameOf, refusalOf, roots, usesLabel } from './categories-data'
import { CategoriesPage, CategoryForm, OtherName, RefusalNote } from './categories-kit'

type Open = { mode: 'edit', id: string } | { mode: 'add', parentId: string | null } | null

/**
 * Option A, "Outline": one list in the guests' order, sub-categories hanging off their parent on a
 * guide line. A row opens in place into its form, with Delete or the reason it is refused at the
 * bottom. Reorder switches every row to up and down arrows. No sheet, no second screen.
 */
export function OutlineOption({ lab, opening }: { lab: CategoryLab, opening: CategoryOpening }) {
  const [open, setOpen] = useState<Open>(() => {
    if (opening.state === 'list')
      return null

    return opening.target ? { mode: 'edit', id: opening.target.id } : { mode: 'add', parentId: null }
  })
  const [reorder, setReorder] = useState(false)
  const { confirm, dialog } = useConfirm()
  const { items, kind } = lab
  const top = roots(items)
  const subs = items.length - top.length

  const remove = async (c: LabCategory) => {
    if (await confirm({ title: `Delete “${nameOf(c)}”?`, body: 'Guests stop seeing it at once. Nothing uses it, so no pin or story changes.', confirmLabel: 'Delete category' })) {
      lab.remove(c.id)
      setOpen(null)
    }
  }

  const editor = (c: LabCategory | undefined, parentId: string | null = null) => {
    const formId = `outline-${c?.id ?? 'new'}`
    const refusal = c && refusalOf(items, c)

    return (
      <div className="flex flex-col gap-4 bg-surface-secondary px-4 py-4">
        <CategoryForm
          category={c}
          formId={formId}
          items={items}
          parentId={parentId}
          onSave={(draft) => {
            lab.save(c?.id, draft)
            setOpen(null)
          }}
        />
        <div className="flex gap-2">
          <Button className="min-h-11 flex-1" form={formId} type="submit">{c ? 'Save' : 'Add category'}</Button>
          <Button className="min-h-11 flex-1" variant="tertiary" onPress={() => setOpen(null)}>Cancel</Button>
        </div>
        {c && (refusal
          ? <RefusalNote c={c} items={items} kind={kind} />
          : (
              <Button className="min-h-11 self-start" variant="danger-soft" onPress={() => void remove(c)}>
                <TrashIcon size={16} />
                Delete category
              </Button>
            ))}
      </div>
    )
  }

  const row = (c: LabCategory, isChild: boolean) => {
    const isOpen = open?.mode === 'edit' && open.id === c.id
    const count = childrenOf(items, c.id).length
    const facts = [c.uses ? usesLabel(kind, c.uses) : 'Not used', !isChild && count ? `${count} sub` : ''].filter(Boolean).join(' · ')

    return (
      <>
        <div className={`flex min-h-14 items-center gap-2 ${isChild ? 'ps-3' : ''}`}>
          {reorder
            ? (
                <>
                  <span className="min-w-0 flex-1 py-2">
                    <span className={`block [overflow-wrap:anywhere] ${isChild ? 'text-sm' : 'font-semibold'}`}>{nameOf(c)}</span>
                  </span>
                  <Button isIconOnly aria-label={`Move ${nameOf(c)} up`} className="min-h-11 min-w-11" isDisabled={!canMove(items, c, -1)} variant="tertiary" onPress={() => lab.move(c.id, -1)}>
                    <ChevronDownIcon className="rotate-180" size={18} />
                  </Button>
                  <Button isIconOnly aria-label={`Move ${nameOf(c)} down`} className="min-h-11 min-w-11" isDisabled={!canMove(items, c, 1)} variant="tertiary" onPress={() => lab.move(c.id, 1)}>
                    <ChevronDownIcon size={18} />
                  </Button>
                </>
              )
            : (
                <button
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 text-start outline-none focus-visible:focus-ring"
                  type="button"
                  onClick={() => setOpen(isOpen ? null : { mode: 'edit', id: c.id })}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block [overflow-wrap:anywhere] ${isChild ? 'text-sm' : 'font-semibold'}`}>{nameOf(c)}</span>
                    <OtherName c={c} className="mt-0.5" />
                  </span>
                  <span className={`shrink-0 text-xs tabular-nums ${c.uses ? 'text-foreground' : 'text-muted'}`}>{facts}</span>
                  <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} size={16} />
                </button>
              )}
        </div>
        {isOpen && !reorder && <div className="-mx-4">{editor(c)}</div>}
      </>
    )
  }

  return (
    <CategoriesPage
      action={(
        <Button className="min-h-11 shrink-0" isDisabled={reorder} onPress={() => setOpen({ mode: 'add', parentId: null })}>
          <PlusIcon size={18} />
          Add
        </Button>
      )}
      lab={lab}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{`${top.length} categories, ${subs} sub-categories`}</p>
          <Button className="min-h-9" size="sm" variant="secondary" onPress={() => setReorder(!reorder)}>
            {reorder ? 'Done' : 'Reorder'}
          </Button>
        </div>
        {open?.mode === 'add' && open.parentId === null && !reorder && (
          <div className="overflow-hidden rounded-3xl shadow-surface">
            <p className="bg-surface-secondary px-4 pt-4 font-semibold">New category</p>
            {editor(undefined)}
          </div>
        )}
        <ul className="flex flex-col divide-y divide-separator overflow-hidden rounded-3xl bg-surface px-4 shadow-surface">
          {top.map((r) => {
            const kids = childrenOf(items, r.id)
            const addingHere = open?.mode === 'add' && open.parentId === r.id

            return (
              <li key={r.id} className="py-1">
                {row(r, false)}
                {(kids.length > 0 || !reorder) && (
                  <ul className="ms-2 mb-2 flex flex-col border-s-2 border-separator">
                    {kids.map(k => <li key={k.id}>{row(k, true)}</li>)}
                    {!reorder && (
                      <li>
                        {addingHere
                          ? <div className="-ms-2 -me-4 overflow-hidden rounded-s-2xl">{editor(undefined, r.id)}</div>
                          : (
                              <button
                                className="flex min-h-11 items-center gap-2 rounded-xl ps-3 text-sm text-muted outline-none focus-visible:focus-ring"
                                type="button"
                                onClick={() => setOpen({ mode: 'add', parentId: r.id })}
                              >
                                <PlusIcon aria-hidden className="shrink-0" size={16} />
                                Add sub-category
                              </button>
                            )}
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      {dialog}
    </CategoriesPage>
  )
}
