import {
  Button,
  Checkbox,
  CheckboxGroup,
  Popover,
  SearchField,
} from '@heroui/react'
import { useState } from 'react'

import { ChevronDownIcon, CloseIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'

export interface FilterOption {
  id: string
  label: string
  /**
   * How many results ticking this option gives, with the search and every OTHER group's
   * filter applied but not this group's (a faceted count). The caller computes it, so a
   * count never promises more than the list will show. `0` sorts the option last, muted.
   */
  count?: number
  /** Another option of the same group: this one is indented under it. One level only. */
  parentId?: string
}

/** One question the list can be narrowed by, with the options ticked now. */
export interface FilterGroup {
  id: string
  /** Names the button and the chip, so word it like the column it narrows ("Status"). */
  label: string
  options: FilterOption[]
  selected: string[]
  /** "Clear all" calls it once per group in one event: patch the state, do not rewrite it from a stale copy. */
  onChange: (selected: string[]) => void
}

/** A group whose option ids are a union type, so callers keep their types. */
export function filterGroup<Id extends string>(group: {
  id: string
  label: string
  options: (FilterOption & { id: Id })[]
  selected: Id[]
  onChange: (selected: Id[]) => void
}): FilterGroup {
  return group as unknown as FilterGroup
}

/** The ticked options' labels, or the "all" wording when nothing is ticked. */
export function selectedLabels(
  options: FilterOption[],
  selected: string[],
  allLabel: string,
) {
  return selected.length
    ? options
        .filter(o => selected.includes(o.id))
        .map(o => o.label)
        .join(', ')
    : allLabel
}

/** A group with more options than this gets a search field above them. */
const SEARCH_ABOVE = 8

interface OptionRow {
  option: FilterOption
  depth: 0 | 1
  isEmpty: boolean
}

const isEmpty = (option: FilterOption) => option.count === 0
function emptyLast<T>(list: T[], empty: (item: T) => boolean) {
  return [...list.filter(item => !empty(item)), ...list.filter(empty)]
}

/**
 * The rows to draw: each parent followed by its children, options with nothing behind them
 * last, and only what matches the typed text (a match on a child keeps its parent in view).
 */
function arrangeOptions(options: FilterOption[], query: string): OptionRow[] {
  const text = query.trim().toLowerCase()
  const hit = (option: FilterOption) => !text || option.label.toLowerCase().includes(text)
  const byId = new Map(options.map(o => [o.id, o]))
  const parentOf = (option: FilterOption) => (option.parentId ? byId.get(option.parentId) : undefined)
  // Only one level: an option under an option that is itself a child is drawn at the top.
  const isChild = (option: FilterOption) => {
    const parent = parentOf(option)

    return !!parent && !parentOf(parent)
  }
  const childrenOf = (id: string) => options.filter(o => o.parentId === id && isChild(o))
  const live = (top: FilterOption) => !isEmpty(top) || childrenOf(top.id).some(child => !isEmpty(child))
  const rows: OptionRow[] = []

  for (const top of emptyLast(options.filter(o => !isChild(o)), o => !live(o))) {
    const children = childrenOf(top.id)
    const shown = hit(top) ? children : children.filter(hit)

    if (!hit(top) && !shown.length)
      continue
    rows.push({ option: top, depth: 0, isEmpty: isEmpty(top) })
    for (const child of emptyLast(shown, isEmpty))
      rows.push({ option: child, depth: 1, isEmpty: isEmpty(child) })
  }

  return rows
}

/** The ticked ids in the options' own order, so a caller never sees tick order. */
function inOrder(group: FilterGroup, ids: string[]) {
  return group.options.filter(o => ids.includes(o.id)).map(o => o.id)
}

/** The choices of one group: a search above a long list, the checkboxes, nothing else. */
function OptionList({ group, roomy }: { group: FilterGroup, roomy: boolean }) {
  const { t } = useLocale()
  const [query, setQuery] = useState('')
  const rows = arrangeOptions(group.options, query)

  return (
    <div className={`flex min-w-0 flex-col ${roomy ? 'gap-2' : 'gap-1'}`}>
      {group.options.length > SEARCH_ABOVE && (
        <SearchField
          aria-label={t('filter.search')}
          value={query}
          onChange={setQuery}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={t('filter.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      )}
      <CheckboxGroup
        aria-label={group.label}
        className={`[&_[data-slot=checkbox]]:mt-0 ${roomy ? 'gap-2' : 'max-h-72 overflow-y-auto'}`}
        value={group.selected}
        onChange={ids => group.onChange(inOrder(group, ids))}
      >
        {rows.map(({ option, depth, isEmpty: none }) => (
          <Checkbox
            key={option.id}
            className={`${
              roomy
                ? 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'
                : 'min-h-8 justify-center rounded-lg px-3 hover:bg-default'
            } ${depth ? 'ms-6' : ''}`}
            value={option.id}
          >
            <Checkbox.Content className={`w-full flex-row items-center ${roomy ? 'gap-3' : 'gap-2'}`}>
              <Checkbox.Control className={roomy ? 'size-6 shrink-0 rounded-lg' : 'size-5 shrink-0 rounded-md'}>
                <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4" />
              </Checkbox.Control>
              <span className={`min-w-0 flex-1 ${roomy ? 'font-medium' : 'text-sm'} ${none ? 'text-muted' : ''}`}>
                {option.label}
              </span>
              {option.count !== undefined && (
                <span className="text-sm text-muted tabular-nums">
                  {option.count}
                </span>
              )}
            </Checkbox.Content>
          </Checkbox>
        ))}
      </CheckboxGroup>
      {!rows.length && (
        <p className="px-3 py-1.5 text-sm text-muted" role="status">
          {t('filter.noMatch')}
        </p>
      )}
    </div>
  )
}

/** Phones: one group's choices in a bottom sheet, ticked live; "Show" closes it. */
function GroupSheet({
  group,
  onClose,
}: {
  group: FilterGroup
  onClose: () => void
}) {
  const { t } = useLocale()

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={onClose}>
            {t('reports.filter.apply')}
          </Button>
          <Button
            fullWidth
            isDisabled={!group.selected.length}
            variant="tertiary"
            onPress={() => group.onChange([])}
          >
            {t('reports.filter.clear')}
          </Button>
        </>
      )}
      title={group.label}
      onClose={onClose}
    >
      <OptionList roomy group={group} />
    </SheetFrame>
  )
}

function GroupButton({ group, onPress }: { group: FilterGroup, onPress?: () => void }) {
  const { t } = useLocale()
  const active = group.selected.length

  return (
    <Button
      aria-label={active ? t('filter.buttonActive', { label: group.label, count: active }) : undefined}
      className="rounded-full max-lg:h-11"
      variant={active ? 'secondary' : 'tertiary'}
      onPress={onPress}
    >
      {group.label}
      {active > 0 && (
        <span
          aria-hidden
          className="grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-5 font-semibold text-accent-foreground tabular-nums"
        >
          {active}
        </span>
      )}
      <ChevronDownIcon aria-hidden size={14} />
    </Button>
  )
}

/** One button for one group: a popover from 1024 px, a bottom sheet on phones. */
function GroupFilter({ group }: { group: FilterGroup }) {
  const isWide = useIsWide()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  if (!isWide) {
    return (
      <>
        <GroupButton group={group} onPress={() => setIsSheetOpen(true)} />
        {isSheetOpen && (
          <GroupSheet group={group} onClose={() => setIsSheetOpen(false)} />
        )}
      </>
    )
  }

  return (
    <Popover>
      <GroupButton group={group} />
      <Popover.Content className="w-fit max-w-80 min-w-52" placement="bottom start">
        <Popover.Dialog aria-label={group.label} className="p-1">
          <OptionList group={group} roomy={false} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/**
 * One button per group, named like the group ("Status", "Categories") with the number of
 * ticked options once any is ticked. Each opens its own list: a popover from 1024 px, a
 * bottom sheet on phones. Put it beside the page's search field; `FilterChips` shows what
 * is applied.
 */
export function FilterButtons({ groups }: { groups: FilterGroup[] }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {groups.map(group => (
        <GroupFilter key={group.id} group={group} />
      ))}
    </div>
  )
}

/**
 * The filter row of a page without its own search: the buttons, and the applied chips under
 * them.
 */
export function FilterToolbar({ groups }: { groups: FilterGroup[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FilterButtons groups={groups} />
      <FilterChips groups={groups} />
    </div>
  )
}

/**
 * Every group with something ticked as one chip, "Status: Draft, Hidden", that clears the
 * group when pressed, then "Clear all". Nothing is drawn while nothing is ticked.
 */
export function FilterChips({ groups }: { groups: FilterGroup[] }) {
  const { t } = useLocale()
  const applied = groups.filter(g => g.selected.length)

  if (!applied.length)
    return null

  return (
    <div
      aria-label={t('filter.applied')}
      className="flex flex-wrap items-center gap-1.5"
      role="group"
    >
      {applied.map((group) => {
        const text = `${group.label}: ${selectedLabels(group.options, group.selected, '')}`

        return (
          <Button
            key={group.id}
            aria-label={t('filter.remove', { name: text })}
            className="h-auto max-w-full min-h-8 rounded-full py-1 max-lg:min-h-11"
            size="sm"
            variant="secondary"
            onPress={() => group.onChange([])}
          >
            <span className="min-w-0 truncate">{text}</span>
            <CloseIcon aria-hidden className="shrink-0" size={14} />
          </Button>
        )
      })}
      <Button
        className="max-lg:min-h-11"
        size="sm"
        variant="ghost"
        onPress={() => applied.forEach(g => g.onChange([]))}
      >
        {t('filter.clearAll')}
      </Button>
    </div>
  )
}
