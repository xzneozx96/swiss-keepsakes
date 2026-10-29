import type { LabCategory } from './categories-data'
import type { CategoryOpening } from './categories-lab-app'
import type { CategoryLab } from './categories-state'
import type { RowAction } from '@/components/row-actions'

import { Button, SearchField, Table } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ChevronDownIcon, EditIcon, InfoIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { SheetFrame } from '@/components/sheet-frame'
import { StatusChip } from '@/components/status-chip'
import { canMove, childrenOf, displayOrder, nameOf, refusalOf, roots, usesLabel } from './categories-data'
import { CategoriesPage, CategoryForm, OtherName, RefusalNote } from './categories-kit'

type ActionId = 'edit' | 'add-sub' | 'up' | 'down' | 'delete'
type Sheet = { mode: 'form', id: string | undefined, parentId: string | null } | { mode: 'refused', id: string } | null

function matches(c: LabCategory, query: string) {
  const q = query.trim().toLowerCase()

  return !q || [c.en, c.de].some(name => name?.toLowerCase().includes(q))
}

/**
 * Option C, "Table": the dashboard's table with the guests' order as grouped rows (sub-categories
 * indented under their parent), columns for both names, use and order, and the ⋯ row menu. Phones
 * get one card per top-level category with its sub-categories inside. Add and edit open the app's
 * sheet; a refused delete opens a sheet that says why.
 */
export function TableOption({ lab, opening }: { lab: CategoryLab, opening: CategoryOpening }) {
  const [sheet, setSheet] = useState<Sheet>(() => {
    if (opening.state === 'edit')
      return { mode: 'form', id: opening.target?.id, parentId: null }

    return opening.state === 'refused' && opening.target ? { mode: 'refused', id: opening.target.id } : null
  })
  const [query, setQuery] = useState('')
  const { confirm, dialog } = useConfirm()
  const { items, kind } = lab
  const shown = displayOrder(items).filter(c => matches(c, query) || childrenOf(items, c.id).some(k => matches(k, query)))
  const target = items.find(c => c.id === sheet?.id)

  const onAction = async (c: LabCategory, id: ActionId) => {
    if (id === 'edit')
      setSheet({ mode: 'form', id: c.id, parentId: null })
    else if (id === 'add-sub')
      setSheet({ mode: 'form', id: undefined, parentId: c.id })
    else if (id === 'up' || id === 'down')
      lab.move(c.id, id === 'up' ? -1 : 1)
    else if (refusalOf(items, c))
      setSheet({ mode: 'refused', id: c.id })
    else if (await confirm({ title: `Delete “${nameOf(c)}”?`, body: 'Guests stop seeing it at once. Nothing uses it, so no pin or story changes.', confirmLabel: 'Delete category' }))
      lab.remove(c.id)
  }

  const actions = (c: LabCategory) => {
    const list: RowAction<ActionId>[] = [
      { id: 'edit', label: 'Edit', icon: EditIcon },
      ...(c.parentId === null ? [{ id: 'add-sub' as const, label: 'Add sub-category', icon: PlusIcon }] : []),
      { id: 'up', label: 'Move up', icon: ChevronDownIcon, flip: true, isDisabled: !canMove(items, c, -1) },
      { id: 'down', label: 'Move down', icon: ChevronDownIcon, isDisabled: !canMove(items, c, 1) },
      { id: 'delete', label: refusalOf(items, c) ? 'Delete (in use)' : 'Delete', icon: TrashIcon },
    ]

    return <RowActions actions={list} label={`Actions for ${nameOf(c)}`} onAction={id => void onAction(c, id)} />
  }

  const missing = (name: string | null, text: string) =>
    name ? <span className="[overflow-wrap:anywhere]">{name}</span> : <StatusChip tone="warning">{text}</StatusChip>

  const uses = (c: LabCategory) => (
    <span className={`tabular-nums ${c.uses ? '' : 'text-muted'}`}>{c.uses ? usesLabel(kind, c.uses) : 'Not used'}</span>
  )

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
      <SearchField aria-label="Search categories" className="w-full lg:w-72" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search in English or German" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {shown.length === 0 && <EmptyState icon={InfoIcon} message={`No category is called “${query}”.`} />}

      {/* Phones: one card per top-level category, its sub-categories inside. */}
      <ul aria-label="Categories" className="flex flex-col gap-4 lg:hidden">
        {roots(shown).map((r) => {
          const kids = shown.filter(k => k.parentId === r.id)

          return (
            <li key={r.id} className="overflow-hidden rounded-3xl bg-surface shadow-surface">
              <div className="flex items-start gap-2 p-4 pe-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]">{nameOf(r)}</span>
                  <OtherName c={r} />
                  <span className="mt-1 text-xs text-muted">
                    {uses(r)}
                    {kids.length > 0 && ` · ${childrenOf(items, r.id).length} sub-categories`}
                  </span>
                </div>
                {actions(r)}
              </div>
              {kids.length > 0 && (
                <ul className="flex flex-col divide-y divide-separator border-t border-separator bg-surface-secondary/60">
                  {kids.map(k => (
                    <li key={k.id} className="flex items-center gap-2 py-2 ps-8 pe-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium [overflow-wrap:anywhere]">{nameOf(k)}</span>
                        <OtherName c={k} />
                      </span>
                      <span className="shrink-0 text-xs">{uses(k)}</span>
                      {actions(k)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {/* From 1024 px: the page table, in the guests' order. */}
      {shown.length > 0 && (
        <Table className="hidden lg:block">
          <Table.ScrollContainer>
            <Table.Content aria-label={kind === 'map' ? 'Map categories' : 'Blog categories'} className="min-w-[44rem]">
              <Table.Header>
                <Table.Column isRowHeader className="w-[34%]">Name</Table.Column>
                <Table.Column className="w-[30%]">German name</Table.Column>
                <Table.Column>Used by</Table.Column>
                <Table.Column className="w-28">Order</Table.Column>
                <Table.Column className="w-16 text-end">Actions</Table.Column>
              </Table.Header>
              <Table.Body>
                {shown.map(c => (
                  <Table.Row key={c.id}>
                    <Table.Cell>
                      <span className={`flex items-center gap-2 ${c.parentId ? 'ps-6' : 'font-semibold'}`}>
                        {c.parentId && <span aria-hidden className="h-4 w-3 shrink-0 rounded-bl-md border-b-2 border-s-2 border-separator" />}
                        <span className="min-w-0">
                          <span className="block [overflow-wrap:anywhere]">{nameOf(c)}</span>
                          {!c.en && <OtherName c={c} />}
                        </span>
                      </span>
                    </Table.Cell>
                    <Table.Cell>{missing(c.de, 'Missing')}</Table.Cell>
                    <Table.Cell>
                      {uses(c)}
                      {c.parentId === null && childrenOf(items, c.id).length > 0 && <span className="text-muted">{` · ${childrenOf(items, c.id).length} sub`}</span>}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="flex gap-1">
                        <Button isIconOnly aria-label={`Move ${nameOf(c)} up`} isDisabled={!canMove(items, c, -1)} size="sm" variant="tertiary" onPress={() => lab.move(c.id, -1)}>
                          <ChevronDownIcon className="rotate-180" size={16} />
                        </Button>
                        <Button isIconOnly aria-label={`Move ${nameOf(c)} down`} isDisabled={!canMove(items, c, 1)} size="sm" variant="tertiary" onPress={() => lab.move(c.id, 1)}>
                          <ChevronDownIcon size={16} />
                        </Button>
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">{actions(c)}</div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <SheetFrame
        footer={sheet?.mode === 'refused'
          ? <Button fullWidth className="min-h-11" variant="secondary" onPress={() => setSheet(null)}>Got it</Button>
          : (
              <>
                <Button fullWidth className="min-h-11" form="table-form" type="submit">{target ? 'Save' : 'Add category'}</Button>
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
            formId="table-form"
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
