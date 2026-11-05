import { Button, ScrollShadow } from '@heroui/react'

export interface ChipRowItem {
  id: string
  label: string
  /** Written after the label as "Label · N", as the shared tab row does. */
  count?: number
}

/**
 * The guest single-choice filter row (stories categories, search kinds), made of our Button pills (owner, 05.11.2026): the
 * same pill as "See all on the map" and the map's Categories and List buttons. A choice is `secondary` (grey), the chosen one
 * `primary` (red), so the colour and the toggle state (`aria-pressed`) carry it, no extra check. The row scrolls sideways,
 * never wraps, and never clears: pressing the chosen pill keeps it. The small button size, no shadow and no check (owner,
 * 05.11.2026: the 44 px pills were too large).
 */
export function ChipRow({ label, items, selected, onChange }: {
  label: string
  items: readonly ChipRowItem[]
  selected: string
  onChange: (id: string) => void
}) {
  return (
    <ScrollShadow hideScrollBar className="-mx-4" orientation="horizontal" size={40}>
      <div aria-label={label} className="flex w-max gap-2 px-4 py-1" role="group">
        {items.map((item) => {
          const chosen = item.id === selected

          return (
            <Button
              key={item.id}
              aria-pressed={chosen}
              className="shrink-0 whitespace-nowrap shadow-none"
              size="sm"
              variant={chosen ? 'primary' : 'secondary'}
              onPress={() => {
                if (!chosen)
                  onChange(item.id)
              }}
            >
              {/* "Label · N", the count format of the shared tab row (page-tabs.tsx). */}
              {item.label}
              {item.count !== undefined && ` · ${item.count}`}
            </Button>
          )
        })}
      </div>
    </ScrollShadow>
  )
}
