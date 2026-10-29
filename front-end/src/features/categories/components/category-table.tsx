import type { CategoryKind, MerchantCategory } from '@sk/api-contract'
import type { CategoryActions } from '../hooks/use-category-actions'
import type { RowAction } from '@/components/row-actions'

import { SearchField } from '@heroui/react'
import { useRef, useState } from 'react'

import { DataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ChevronDownIcon, EditIcon, InfoIcon, PlusIcon, StatusWarningIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { useLevelDrag } from '../hooks/use-level-drag'
import { canMove, childrenOf, displayOrder, matches, nameOf, refusalOf, siblingsOf } from '../lib/category-tree'
import { DropSlot, Grip } from './category-drag'

type ActionId = 'edit' | 'add-sub' | 'up' | 'down' | 'delete'

/**
 * From 1024 px: the page table in the guests' order, sub-categories indented under their parent.
 * A parent's handle drags it among the parents (its sub-categories fold away while it moves); a
 * sub-category's handle drags it among its siblings only. ArrowUp and ArrowDown on a handle, or
 * Move up and Move down in the menu, do the same from the keyboard.
 */
export function CategoryTable({ items, kind, actions, busy }: {
  items: MerchantCategory[]
  kind: CategoryKind
  actions: CategoryActions
  busy: boolean
}) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const [folded, setFolded] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<string | null>(null)
  const parentSlotRef = useRef<HTMLDivElement>(null)
  const childSlotRef = useRef<HTMLDivElement>(null)
  const searching = query.trim() !== ''
  const rows = displayOrder(items)
    .filter(category => !(folded && category.parentId))
    .filter(category => matches(category, query) || childrenOf(items, category.id).some(child => matches(child, query)))

  const rowsOf = (level: string) =>
    Array.from(boxRef.current?.querySelectorAll(`[data-level="${level}"]`) ?? [], element => element.closest('tr')!)
  const parents = useLevelDrag({
    placeholderRef: parentSlotRef,
    rows: () => rowsOf('root'),
    onStart: () => setFolded(true),
    onDrop: (from, to) => actions.reorder(null, from, to),
    onEnd: () => setFolded(false),
  })
  const children = useLevelDrag({
    placeholderRef: childSlotRef,
    rows: () => rowsOf(`in-${groupRef.current}`),
    onDrop: (from, to) => actions.reorder(groupRef.current, from, to),
  })

  const onAction = (category: MerchantCategory, id: ActionId) => {
    if (id === 'edit')
      actions.edit(category)
    else if (id === 'add-sub')
      actions.addSub(category)
    else if (id === 'up' || id === 'down')
      actions.move(category, id === 'up' ? -1 : 1)
    else actions.remove(category)
  }

  const menu = (category: MerchantCategory) => {
    const list: RowAction<ActionId>[] = [
      { id: 'edit', label: t('categories.edit'), icon: EditIcon },
      ...(category.parentId === null ? [{ id: 'add-sub' as const, label: t('categories.addSub'), icon: PlusIcon }] : []),
      { id: 'up', label: t('categories.moveUp'), icon: ChevronDownIcon, flip: true, isDisabled: busy || !canMove(items, category, -1) },
      { id: 'down', label: t('categories.moveDown'), icon: ChevronDownIcon, isDisabled: busy || !canMove(items, category, 1) },
      { id: 'delete', label: t(refusalOf(category) ? 'categories.deleteInUse' : 'categories.delete'), icon: TrashIcon },
    ]

    return <RowActions actions={list} label={t('table.rowActions', { name: nameOf(category) })} onAction={id => onAction(category, id)} />
  }

  const grip = (category: MerchantCategory) => {
    if (searching)
      return <span aria-hidden className="size-9 shrink-0" />
    const index = siblingsOf(items, category).findIndex(sibling => sibling.id === category.id)
    const drag = category.parentId ? children : parents

    return (
      <span className="contents" data-level={category.parentId ? `in-${category.parentId}` : 'root'}>
        <Grip
          id={category.id}
          label={t('categories.drag', { name: nameOf(category) })}
          props={drag.handleProps(index)}
          onPointerDown={() => {
            groupRef.current = category.parentId
          }}
          onStep={direction => actions.reorder(category.parentId, index, index + direction)}
        />
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchField aria-label={t('categories.search.label')} className="w-72" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t('categories.search.placeholder')} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {rows.length === 0
        ? <EmptyState icon={InfoIcon} message={t(searching ? 'categories.search.empty' : `categories.empty.${kind}`, { query: query.trim() })} />
        : (
            <div ref={boxRef} className="relative [&_tr[data-lifted]]:bg-surface [&_tr[data-lifted]]:shadow-overlay">
              <DataTable
                hidePager
                columns={[
                  {
                    id: 'name',
                    header: t('categories.col.name'),
                    isRowHeader: true,
                    headerClassName: 'w-[36%]',
                    render: category => (
                      <span className={`-ms-2 flex items-center gap-1 ${category.parentId ? 'ps-7' : 'font-semibold'}`}>
                        {grip(category)}
                        {category.parentId && <span aria-hidden className="h-4 w-3 shrink-0 rounded-bl-md border-s-2 border-b-2 border-separator" />}
                        <span className="min-w-0">
                          <span className="block [overflow-wrap:anywhere]">{nameOf(category)}</span>
                          {category.name.en === null && (
                            <span className="flex items-center gap-1 text-xs font-normal text-warning-soft-foreground">
                              <StatusWarningIcon aria-hidden className="shrink-0" size={12} />
                              {t('categories.noName.en')}
                            </span>
                          )}
                        </span>
                      </span>
                    ),
                  },
                  {
                    id: 'de',
                    header: t('categories.col.de'),
                    headerClassName: 'w-[28%]',
                    render: category => category.name.de === null
                      ? <StatusChip tone="warning">{t('categories.missing')}</StatusChip>
                      : <span className="[overflow-wrap:anywhere]">{category.name.de}</span>,
                  },
                  {
                    id: 'used',
                    header: t('categories.col.usedBy'),
                    render: category => (
                      <>
                        <span className={`tabular-nums ${category.useCount ? '' : 'text-muted'}`}>
                          {category.useCount ? t(`categories.uses.${kind}.${category.useCount === 1 ? 'one' : 'other'}`, { n: category.useCount }) : t('categories.unused')}
                        </span>
                        {category.parentId === null && category.childCount > 0 && (
                          <span className="whitespace-nowrap text-muted">{` · ${t(`categories.subs.${category.childCount === 1 ? 'one' : 'other'}`, { n: category.childCount })}`}</span>
                        )}
                      </>
                    ),
                  },
                ]}
                contentClassName="min-w-[44rem]"
                getRowId={category => category.id}
                label={t(`categories.tab.${kind}`)}
                rowActions={{ headerClassName: 'w-16', render: menu }}
                rows={rows}
              />
              <DropSlot ref={parentSlotRef} />
              <DropSlot ref={childSlotRef} />
            </div>
          )}
      {!searching && <p className="text-xs text-muted">{t('categories.dragHint')}</p>}
    </div>
  )
}
