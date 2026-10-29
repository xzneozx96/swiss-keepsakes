import type { LabCategory } from './categories-data'
import type { EditorActions } from './categories-editor'
import type { CategoryLab } from './categories-state'
import type { RowAction } from '@/components/row-actions'

import { SearchField, Table } from '@heroui/react'
import { useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ChevronDownIcon, EditIcon, InfoIcon, PlusIcon, TrashIcon } from '@/components/icons'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { canMove, childrenOf, displayOrder, matches, nameOf, refusalOf, usesLabel } from './categories-data'
import { DropSlot, Grip } from './categories-drag'
import { OtherName } from './categories-kit'
import { useLevelDrag } from './categories-level-drag'

type ActionId = 'edit' | 'add-sub' | 'up' | 'down' | 'delete'

/**
 * From 1024 px: the page table in the guests' order, sub-categories indented under their parent.
 * A parent's handle drags it among the parents (its sub-categories fold away while it moves); a
 * sub-category's handle drags it among its siblings only. ArrowUp and ArrowDown on a handle, or
 * Move up and Move down in the ⋯ menu, do the same from the keyboard.
 */
export function CategoryTable({ lab, actions }: { lab: CategoryLab, actions: EditorActions }) {
  const [query, setQuery] = useState('')
  const [folded, setFolded] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<string | null>(null)
  const parentSlotRef = useRef<HTMLDivElement>(null)
  const childSlotRef = useRef<HTMLDivElement>(null)
  const { items, kind } = lab
  const searching = query.trim() !== ''
  const shown = displayOrder(items)
    .filter(c => !(folded && c.parentId))
    .filter(c => matches(c, query) || childrenOf(items, c.id).some(k => matches(k, query)))

  const rowsOf = (level: string) =>
    Array.from(boxRef.current?.querySelectorAll(`[data-level="${level}"]`) ?? [], el => el.closest('tr')!)
  const parents = useLevelDrag({
    placeholderRef: parentSlotRef,
    rows: () => rowsOf('root'),
    onStart: () => setFolded(true),
    onDrop: (from, to) => lab.reorder(null, from, to),
    onEnd: () => setFolded(false),
  })
  const children = useLevelDrag({
    placeholderRef: childSlotRef,
    rows: () => rowsOf(`in-${groupRef.current}`),
    onDrop: (from, to) => lab.reorder(groupRef.current, from, to),
  })

  const onAction = (c: LabCategory, id: ActionId) => {
    if (id === 'edit')
      actions.edit(c)
    else if (id === 'add-sub')
      actions.addSub(c)
    else if (id === 'up' || id === 'down')
      lab.move(c.id, id === 'up' ? -1 : 1)
    else void actions.remove(c)
  }

  const menu = (c: LabCategory) => {
    const list: RowAction<ActionId>[] = [
      { id: 'edit', label: 'Edit', icon: EditIcon },
      ...(c.parentId === null ? [{ id: 'add-sub' as const, label: 'Add sub-category', icon: PlusIcon }] : []),
      { id: 'up', label: 'Move up', icon: ChevronDownIcon, flip: true, isDisabled: !canMove(items, c, -1) },
      { id: 'down', label: 'Move down', icon: ChevronDownIcon, isDisabled: !canMove(items, c, 1) },
      { id: 'delete', label: refusalOf(items, c) ? 'Delete (in use)' : 'Delete', icon: TrashIcon },
    ]

    return <RowActions actions={list} label={`Actions for ${nameOf(c)}`} onAction={id => onAction(c, id)} />
  }

  const grip = (c: LabCategory) => {
    if (searching)
      return <span aria-hidden className="size-9 shrink-0" />
    const siblings = items.filter(s => s.parentId === c.parentId)
    const index = siblings.indexOf(c)
    const drag = c.parentId ? children : parents

    return (
      <span className="contents" data-level={c.parentId ? `in-${c.parentId}` : 'root'}>
        <Grip
          id={c.id}
          label={`Drag to reorder ${nameOf(c)}`}
          props={drag.handleProps(index)}
          onPointerDown={() => {
            groupRef.current = c.parentId
          }}
          onStep={direction => lab.reorder(c.parentId, index, index + direction)}
        />
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchField aria-label="Search categories" className="w-72" value={query} onChange={setQuery}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Search in English or German" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {shown.length === 0
        ? <EmptyState icon={InfoIcon} message={`No category is called “${query}”.`} />
        : (
            <div ref={boxRef}>
              <Table>
                <Table.ScrollContainer className="relative">
                  <Table.Content aria-label={kind === 'map' ? 'Map categories' : 'Blog categories'} className="min-w-[44rem]">
                    <Table.Header>
                      <Table.Column isRowHeader className="w-[36%]">Name</Table.Column>
                      <Table.Column className="w-[28%]">German name</Table.Column>
                      <Table.Column>Used by</Table.Column>
                      <Table.Column className="w-16 text-end">Actions</Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {shown.map(c => (
                        <Table.Row key={c.id} className="data-[lifted]:bg-surface data-[lifted]:shadow-overlay">
                          <Table.Cell>
                            <span className={`-ms-2 flex items-center gap-1 ${c.parentId ? 'ps-7' : 'font-semibold'}`}>
                              {grip(c)}
                              {c.parentId && <span aria-hidden className="h-4 w-3 shrink-0 rounded-bl-md border-s-2 border-b-2 border-separator" />}
                              <span className="min-w-0">
                                <span className="block [overflow-wrap:anywhere]">{nameOf(c)}</span>
                                {!c.en && <OtherName c={c} />}
                              </span>
                            </span>
                          </Table.Cell>
                          <Table.Cell>{c.de ? <span className="[overflow-wrap:anywhere]">{c.de}</span> : <StatusChip tone="warning">Missing</StatusChip>}</Table.Cell>
                          <Table.Cell>
                            <span className={`tabular-nums ${c.uses ? '' : 'text-muted'}`}>{c.uses ? usesLabel(kind, c.uses) : 'Not used'}</span>
                            {c.parentId === null && childrenOf(items, c.id).length > 0 && <span className="whitespace-nowrap text-muted">{` · ${childrenOf(items, c.id).length} sub-categories`}</span>}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex justify-end">{menu(c)}</div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                  <DropSlot ref={parentSlotRef} />
                  <DropSlot ref={childSlotRef} />
                </Table.ScrollContainer>
              </Table>
            </div>
          )}
      {!searching && <p className="text-xs text-muted">Drag ⋮⋮ to change the order guests see. A sub-category moves only among its siblings; to put it under another category, edit its “Sits under”.</p>}
    </div>
  )
}
