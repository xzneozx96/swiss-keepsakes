import type { LabCategory } from './categories-data'
import type { CategoryOpening } from './categories-lab-app'
import type { CategoryLab } from './categories-state'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import {
  BackIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
  TrashIcon,
} from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { canMove, childrenOf, nameOf, positionOf, refusalOf, roots, usedBy, usesLabel } from './categories-data'
import { CategoriesPage, CategoryForm, OtherName, UsageMeter } from './categories-kit'

type Sheet = { id: string | undefined, parentId: string | null } | null

const card = 'flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface'

/**
 * Option B, "Drill-in": the top-level categories as a short list with how much each is used; a tap
 * opens the category's own page (beside the list from 1024 px). The page holds its names, its
 * place in the order, its sub-categories and a Delete checklist that says what still blocks it.
 * Names are edited in the app's sheet.
 */
export function DrillOption({ lab, opening }: { lab: CategoryLab, opening: CategoryOpening }) {
  const [selected, setSelected] = useState<string | null>(() => opening.target?.id ?? null)
  const [sheet, setSheet] = useState<Sheet>(() => (opening.state === 'edit' ? { id: opening.target?.id, parentId: null } : null))
  const { confirm, dialog } = useConfirm()
  const { items, kind } = lab
  const top = roots(items)
  const max = Math.max(0, ...items.map(c => c.uses))
  const current = items.find(c => c.id === selected) ?? top[0]
  const editing = items.find(c => c.id === sheet?.id)

  const remove = async (c: LabCategory) => {
    if (await confirm({ title: `Delete “${nameOf(c)}”?`, body: 'Guests stop seeing it at once. Nothing uses it, so no pin or story changes.', confirmLabel: 'Delete category' })) {
      lab.remove(c.id)
      setSelected(c.parentId)
    }
  }

  return (
    <CategoriesPage
      action={(
        <Button className="min-h-11 shrink-0" onPress={() => setSheet({ id: undefined, parentId: null })}>
          <PlusIcon size={18} />
          Add
        </Button>
      )}
      lab={lab}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <ul aria-label="Top-level categories" className={`flex flex-col divide-y divide-separator overflow-hidden rounded-3xl bg-surface shadow-surface ${selected ? 'max-lg:hidden' : ''}`}>
          {top.map((c) => {
            const count = childrenOf(items, c.id).length
            const active = current?.id === c.id || current?.parentId === c.id

            return (
              <li key={c.id}>
                <button
                  aria-current={active ? 'true' : undefined}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:focus-ring lg:aria-[current]:bg-default"
                  type="button"
                  onClick={() => setSelected(c.id)}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-semibold [overflow-wrap:anywhere]">{nameOf(c)}</span>
                    <OtherName c={c} />
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <UsageMeter label={usesLabel(kind, c.uses)} max={max} value={c.uses} />
                      {count > 0 && <span className="text-xs text-muted">{`${count} sub`}</span>}
                    </span>
                  </span>
                  <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
                </button>
              </li>
            )
          })}
        </ul>

        {current && (
          <Detail
            c={current}
            className={selected ? '' : 'max-lg:hidden'}
            lab={lab}
            max={max}
            onAddChild={() => setSheet({ id: undefined, parentId: current.id })}
            onBack={() => setSelected(current.parentId)}
            onDelete={() => void remove(current)}
            onEdit={() => setSheet({ id: current.id, parentId: null })}
            onOpen={setSelected}
          />
        )}
      </div>

      <SheetFrame
        footer={(
          <>
            <Button fullWidth className="min-h-11" form="drill-form" type="submit">{editing ? 'Save' : 'Add category'}</Button>
            <Button fullWidth className="min-h-11" variant="tertiary" onPress={() => setSheet(null)}>Cancel</Button>
          </>
        )}
        isOpen={sheet !== null}
        title={editing ? `Edit “${nameOf(editing)}”` : sheet?.parentId ? 'New sub-category' : 'New category'}
        onClose={() => setSheet(null)}
      >
        {sheet && (
          <CategoryForm
            key={sheet.id ?? `new-${sheet.parentId}`}
            category={editing}
            formId="drill-form"
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

function Detail({ c, lab, max, className, onBack, onEdit, onDelete, onAddChild, onOpen }: {
  c: LabCategory
  lab: CategoryLab
  max: number
  className: string
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onAddChild: () => void
  onOpen: (id: string) => void
}) {
  const { items, kind } = lab
  const parent = items.find(p => p.id === c.parentId)
  const kids = childrenOf(items, c.id)
  const { index, of } = positionOf(items, c)
  const refusal = refusalOf(items, c)

  return (
    <section aria-label={nameOf(c)} className={`flex min-w-0 flex-col gap-4 ${className}`}>
      <button className="flex min-h-11 items-center gap-2 self-start rounded-full text-sm font-medium outline-none focus-visible:focus-ring lg:hidden" type="button" onClick={onBack}>
        <BackIcon aria-hidden size={18} />
        {parent ? nameOf(parent) : 'All categories'}
      </button>

      <div className={card}>
        <span className="text-label text-muted">{parent ? `Sub-category of ${nameOf(parent)}` : 'Top-level category'}</span>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-heading [overflow-wrap:anywhere]">{nameOf(c)}</h2>
          <Button className="min-h-11 shrink-0" variant="secondary" onPress={onEdit}>
            <EditIcon size={16} />
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">English</dt>
          <dd className={c.en ? '' : 'text-warning-soft-foreground'}>{c.en ?? 'Missing'}</dd>
          <dt className="text-muted">German</dt>
          <dd className={`[overflow-wrap:anywhere] ${c.de ? '' : 'text-warning-soft-foreground'}`}>{c.de ?? 'Missing'}</dd>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={card}>
          <span className="text-label text-muted">Used by</span>
          <span className="text-heading tabular-nums">{c.uses}</span>
          <UsageMeter label={c.uses === 1 ? usedBy[kind].one : usedBy[kind].many} max={max} value={c.uses} />
        </div>
        <div className={card}>
          <span className="text-label text-muted">Position</span>
          <span className="text-heading tabular-nums">{`${index} of ${of}`}</span>
          <div className="flex gap-1">
            <Button isIconOnly aria-label={`Move ${nameOf(c)} up`} className="min-h-11 min-w-11" isDisabled={!canMove(items, c, -1)} variant="secondary" onPress={() => lab.move(c.id, -1)}>
              <ChevronDownIcon className="rotate-180" size={18} />
            </Button>
            <Button isIconOnly aria-label={`Move ${nameOf(c)} down`} className="min-h-11 min-w-11" isDisabled={!canMove(items, c, 1)} variant="secondary" onPress={() => lab.move(c.id, 1)}>
              <ChevronDownIcon size={18} />
            </Button>
          </div>
        </div>
      </div>

      {c.parentId === null && (
        <div className={card}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">{`Sub-categories (${kids.length})`}</h3>
            <Button className="min-h-9" size="sm" variant="secondary" onPress={onAddChild}>
              <PlusIcon size={16} />
              Add
            </Button>
          </div>
          {kids.length === 0
            ? <p className="text-sm text-muted">None. Guests see this category on its own.</p>
            : (
                <ul className="-mx-4 flex flex-col divide-y divide-separator">
                  {kids.map(k => (
                    <li key={k.id}>
                      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onOpen(k.id)}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium [overflow-wrap:anywhere]">{nameOf(k)}</span>
                          <OtherName c={k} />
                        </span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">{usesLabel(kind, k.uses)}</span>
                        <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      )}

      <div className={card}>
        <h3 className="font-semibold">Delete</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {c.parentId === null && (
            <Check ok={kids.length === 0} text={kids.length ? `${kids.length} sub-categories still sit under it` : 'No sub-categories'} />
          )}
          <Check ok={c.uses === 0} text={c.uses ? `${usesLabel(kind, c.uses)} use it. Remove it from them in ${kind === 'map' ? 'Places' : 'Stories'}.` : `No ${usedBy[kind].many} use it`} />
        </ul>
        <Button className="min-h-11 self-start" isDisabled={refusal !== null} variant="danger-soft" onPress={onDelete}>
          <TrashIcon size={16} />
          Delete category
        </Button>
      </div>
    </section>
  )
}

function Check({ ok, text }: { ok: boolean, text: string }) {
  const Icon = ok ? StatusSuccessIcon : StatusWarningIcon

  return (
    <li className={`flex items-start gap-2 ${ok ? '' : 'text-warning-soft-foreground'}`}>
      <Icon aria-hidden className={`mt-0.5 shrink-0 ${ok ? 'text-success' : ''}`} size={16} />
      {text}
    </li>
  )
}
