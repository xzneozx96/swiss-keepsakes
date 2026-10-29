import type { LabCategory } from './categories-data'
import type { EditorActions } from './categories-editor'
import type { CategoryLab } from './categories-state'

import { Button, SearchField } from '@heroui/react'
import { useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import {
  BackIcon,
  ChevronRightIcon,
  EditIcon,
  InfoIcon,
  PlusIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
  TrashIcon,
} from '@/components/icons'
import { childrenOf, factsOf, matches, nameOf, refusalOf, roots, usedBy, usesLabel } from './categories-data'
import { DropSlot, Grip } from './categories-drag'
import { OtherName } from './categories-kit'
import { useLevelDrag } from './categories-level-drag'

const card = 'flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface'

/**
 * Phones: the drill-in. The top-level categories as one list (drag the handle to reorder), a tap
 * opens the category's page: names, what uses it, its sub-categories (drag to reorder among
 * themselves) and a Delete checklist that says what still blocks it.
 */
export function CategoryDrill({ lab, pageId, onPage, actions }: {
  lab: CategoryLab
  pageId: string | null
  onPage: (id: string | null) => void
  actions: EditorActions
}) {
  const page = lab.items.find(c => c.id === pageId)

  return page
    ? <CategoryPage key={page.id} actions={actions} c={page} lab={lab} onPage={onPage} />
    : <CategoryList lab={lab} onPage={onPage} />
}

/** A drag list of one level: `ol` rows with the handle first, the rest of the row opens a page. */
function DragList({ items, label, lab, parentId, row }: {
  items: LabCategory[]
  label: string
  lab: CategoryLab
  parentId: string | null
  row: (c: LabCategory) => React.ReactNode
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const slotRef = useRef<HTMLDivElement>(null)
  const drag = useLevelDrag({
    placeholderRef: slotRef,
    rows: () => Array.from(listRef.current?.children ?? []) as HTMLElement[],
    onDrop: (from, to) => lab.reorder(parentId, from, to),
  })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={label} className="flex flex-col divide-y divide-separator">
        {items.map((c, index) => (
          <li key={c.id} className="group bg-surface data-[lifted]:rounded-2xl data-[lifted]:shadow-overlay">
            <div className="flex items-center ps-1">
              <Grip
                id={c.id}
                label={`Drag to reorder ${nameOf(c)}`}
                props={drag.handleProps(index)}
                onStep={direction => lab.reorder(parentId, index, index + direction)}
              />
              {row(c)}
            </div>
          </li>
        ))}
      </ol>
      <DropSlot ref={slotRef} />
    </div>
  )
}

function CategoryList({ lab, onPage }: { lab: CategoryLab, onPage: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const { items, kind } = lab
  const top = roots(items)
  const found = items.filter(c => matches(c, query))

  const row = (c: LabCategory) => (
    <button className="flex min-w-0 flex-1 items-center gap-3 py-3 pe-4 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(c.id)}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold [overflow-wrap:anywhere]">{nameOf(c)}</span>
        {c.parentId && <span className="text-xs text-muted">{`In ${nameOf(items.find(p => p.id === c.parentId)!)}`}</span>}
        <OtherName c={c} />
        <span className="text-xs text-muted tabular-nums">{factsOf(items, c, kind)}</span>
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={18} />
    </button>
  )

  return (
    <div className="flex flex-col gap-3">
      <SearchField aria-label="Search categories" className="w-full" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search in English or German" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {query.trim()
        ? found.length === 0
          ? <EmptyState icon={InfoIcon} message={`No category is called “${query}”.`} />
          : (
              // While searching the list is not in order, so it has no handles.
              <ul aria-label="Search results" className="flex flex-col divide-y divide-separator overflow-hidden rounded-3xl bg-surface ps-4 shadow-surface">
                {found.map(c => <li key={c.id} className="flex">{row(c)}</li>)}
              </ul>
            )
        : (
            <>
              <div className="overflow-hidden rounded-3xl bg-surface shadow-surface">
                <DragList items={top} label="Top-level categories" lab={lab} parentId={null} row={row} />
              </div>
              <p className="px-1 text-xs text-muted">Drag ⋮⋮ to change the order guests see. Sub-categories are ordered on their category’s page.</p>
            </>
          )}
    </div>
  )
}

function CategoryPage({ c, lab, onPage, actions }: {
  c: LabCategory
  lab: CategoryLab
  onPage: (id: string | null) => void
  actions: EditorActions
}) {
  const { items, kind } = lab
  const parent = items.find(p => p.id === c.parentId)
  const kids = childrenOf(items, c.id)
  const refusal = refusalOf(items, c)

  return (
    <section aria-label={nameOf(c)} className="flex min-w-0 flex-col gap-4">
      <button className="flex min-h-11 items-center gap-2 self-start rounded-full text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(c.parentId)}>
        <BackIcon aria-hidden size={18} />
        {parent ? nameOf(parent) : 'All categories'}
      </button>

      <div className={card}>
        <span className="text-label text-muted">{parent ? `Sub-category of ${nameOf(parent)}` : 'Top-level category'}</span>
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-heading [overflow-wrap:anywhere]">{nameOf(c)}</h2>
          <Button className="min-h-11 shrink-0" variant="secondary" onPress={() => actions.edit(c)}>
            <EditIcon size={16} />
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">English</dt>
          <dd className={c.en ? '' : 'text-warning-soft-foreground'}>{c.en ?? 'Missing'}</dd>
          <dt className="text-muted">German</dt>
          <dd className={`[overflow-wrap:anywhere] ${c.de ? '' : 'text-warning-soft-foreground'}`}>{c.de ?? 'Missing'}</dd>
          <dt className="text-muted">Used by</dt>
          <dd className="tabular-nums">{c.uses ? usesLabel(kind, c.uses) : `No ${usedBy[kind].many}`}</dd>
        </dl>
      </div>

      {c.parentId === null && (
        <div className="flex flex-col overflow-hidden rounded-3xl bg-surface shadow-surface">
          <div className="flex items-center justify-between gap-3 p-4 pb-2">
            <h3 className="font-semibold">{`Sub-categories (${kids.length})`}</h3>
            <Button className="min-h-9" size="sm" variant="secondary" onPress={() => actions.addSub(c)}>
              <PlusIcon size={16} />
              Add
            </Button>
          </div>
          {kids.length === 0
            ? <p className="px-4 pb-4 text-sm text-muted">None. Guests see this category on its own.</p>
            : (
                <DragList
                  items={kids}
                  label={`Sub-categories of ${nameOf(c)}`}
                  lab={lab}
                  parentId={c.id}
                  row={k => (
                    <button className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pe-4 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onPage(k.id)}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium [overflow-wrap:anywhere]">{nameOf(k)}</span>
                        <OtherName c={k} />
                      </span>
                      <span className="shrink-0 text-xs text-muted tabular-nums">{k.uses ? usesLabel(kind, k.uses) : 'Not used'}</span>
                      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={16} />
                    </button>
                  )}
                />
              )}
        </div>
      )}

      <div className={card}>
        <h3 className="font-semibold">Delete</h3>
        <ul className="flex flex-col gap-2 text-sm">
          {c.parentId === null && (
            <Check ok={kids.length === 0} text={kids.length ? `${kids.length} sub-categories still sit under it. Delete them or move them to another category.` : 'No sub-categories'} />
          )}
          <Check ok={c.uses === 0} text={c.uses ? `${usesLabel(kind, c.uses)} use it. Remove it from them in ${kind === 'map' ? 'Places' : 'Stories'}.` : `No ${usedBy[kind].many} use it`} />
        </ul>
        <Button className="min-h-11 self-start" isDisabled={refusal !== null} variant="danger-soft" onPress={() => void actions.remove(c)}>
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
