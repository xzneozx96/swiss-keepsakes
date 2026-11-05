import type { Key } from '@heroui/react'

import { ScrollShadow, Tag, TagGroup } from '@heroui/react'

export interface ChipRowItem {
  id: string
  label: string
  /** A count shown after the label, muted. */
  count?: number
}

/**
 * The guest single-choice chip row (stories categories, search kinds): HeroUI TagGroup and Tag in their own look, which
 * colours the selected chip. The check comes from the app-wide selected-tag rule in src/styles/components.css (a 12 px
 * check on every selected tag, owner 13.10.2026), so nothing here draws one (two checks were the bug of 05.11.2026). It scrolls sideways, never wraps, and never clears: tapping the selected chip keeps it.
 * Each Tag is at least 44 px high (`min-h-11` on the Tag; the `lg` size alone is 32 px).
 */
export function ChipRow({ label, items, selected, onChange }: {
  label: string
  items: readonly ChipRowItem[]
  selected: string
  onChange: (id: string) => void
}) {
  const onSelectionChange = (keys: 'all' | Set<Key>) => {
    const [first] = keys === 'all' ? [] : [...keys]

    if (first !== undefined)
      onChange(String(first))
  }

  return (
    <TagGroup
      disallowEmptySelection
      aria-label={label}
      selectedKeys={new Set([selected])}
      selectionMode="single"
      size="lg"
      onSelectionChange={onSelectionChange}
    >
      <ScrollShadow hideScrollBar className="-mx-4" orientation="horizontal" size={40}>
        <TagGroup.List className="flex-nowrap px-4 py-1">
          {items.map(item => (
            <Tag
              key={item.id}
              className="min-h-11 whitespace-nowrap"
              id={item.id}
              textValue={item.count === undefined ? item.label : `${item.label} ${item.count}`}
            >
              {item.label}
              {item.count !== undefined && <span className="text-muted tabular-nums">{item.count}</span>}
            </Tag>
          ))}
        </TagGroup.List>
      </ScrollShadow>
    </TagGroup>
  )
}
