import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, PickupIcon, TrashIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useStopDrag } from '@/hooks/use-stop-drag'

/**
 * An ordered list in Details (keepsakes, more to discover), in the app's reorder pattern: the
 * tour keepsakes list of `sections-editor.tsx` (`KeepsakesListSheet`), with `useStopDrag` reused
 * as is. A grip drags the row (mouse, touch, pen); the arrow keys on the grip move it one step and
 * the grip keeps the focus; Escape cancels a drag. A remove action per row.
 */

export interface OrderedItem {
  id: string
  name: string
  photo: string
  note?: string
}

function reorder(ids: string[], from: number, to: number) {
  const next = [...ids]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item!)

  return next
}

export function OrderedRows({ label, items, onChange }: {
  label: string
  items: OrderedItem[]
  onChange: (ids: string[]) => void
}) {
  const ids = items.map(i => i.id)
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || to === from)
      return
    refocusRef.current = ids[from]!
    onChange(reorder(ids, from, to))
    setAnnouncement(`${items[from]!.name} moved to position ${to + 1} of ${ids.length}.`)
  }
  const drag = useStopDrag({ listRef, placeholderRef, onStart: () => undefined, onDrop: moveTo })

  // The row moved in the DOM; give its handle the focus back.
  useEffect(() => {
    if (!refocusRef.current)
      return
    listRef.current?.querySelector<HTMLButtonElement>(`[data-row="${refocusRef.current}"] [data-grip]`)?.focus()
    refocusRef.current = null
  })

  return (
    <div className="relative">
      <ol ref={listRef} aria-label={label} className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.id} className="group" data-row={item.id}>
            <div className="flex items-center gap-2 rounded-2xl py-1.5 group-data-[lifted]:bg-surface group-data-[lifted]:px-2 group-data-[lifted]:shadow-overlay">
              <button
                {...drag.handleProps(index)}
                aria-label={`Move ${item.name}, position ${index + 1} of ${items.length}. Drag, or use the arrow keys.`}
                className="relative grid size-11 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing lg:size-9"
                data-grip=""
                // Inline: globals.css gives every button `touch-action: manipulation`.
                style={{ touchAction: 'none' }}
                type="button"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault()
                    moveTo(index, index + (event.key === 'ArrowUp' ? -1 : 1))
                  }
                  drag.handleProps(index).onKeyDown?.(event)
                }}
              >
                <GripIcon aria-hidden size={18} />
              </button>
              <Media alt="" className="size-11 shrink-0 rounded-xl" photo={item.photo || undefined}>
                {!item.photo && <PickupIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={18} />}
              </Media>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                {item.note && <span className="truncate text-xs text-muted">{item.note}</span>}
              </span>
              <Button
                isIconOnly
                aria-label={`Remove ${item.name}`}
                className="shrink-0 text-danger max-lg:size-11"
                size="sm"
                variant="tertiary"
                onPress={() => onChange(ids.filter(x => x !== item.id))}
              >
                <TrashIcon aria-hidden size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {/* The slot a dragged row will land in (see useStopDrag). */}
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}
