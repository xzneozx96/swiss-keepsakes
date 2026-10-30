import type { ReactNode } from 'react'

import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, TrashIcon } from '@/components/icons'
import { useStopDrag } from '@/hooks/use-stop-drag'

export interface PhotoOrderItem {
  id: string
  /** The row's name: "Photo 1". */
  name: string
  /** The 44 px picture; the row gives it the box. */
  thumbnail: ReactNode
  /** A line under the name, for a state ("Processing the photo…"). It renders its own live region. */
  note?: ReactNode
}

/** The words a screen reader and the live region use; the caller owns the translation. */
export interface PhotoOrderLabels {
  list: string
  cover: string
  move: (name: string, position: number, count: number) => string
  moved: (name: string, position: number, count: number) => string
  remove: (name: string) => string
}

function reorder(ids: string[], from: number, to: number) {
  const next = [...ids]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item!)

  return next
}

/**
 * Photos in order, in the app's reorder pattern (the tour keepsakes list): a grip drags the row, the arrow keys on the
 * grip move it one step and keep the focus, and a live region says where it went. The first is the cover. `onChange`
 * gets the ids in their new order, or without the removed one.
 */
export function PhotoOrder({ items, labels, onChange }: { items: PhotoOrderItem[], labels: PhotoOrderLabels, onChange: (ids: string[]) => void }) {
  const ids = items.map(item => item.id)
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || to === from)
      return
    refocusRef.current = ids[from]!
    onChange(reorder(ids, from, to))
    setAnnouncement(labels.moved(items[from]!.name, to + 1, ids.length))
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
      <ol ref={listRef} aria-label={labels.list} className="flex flex-col">
        {items.map((item, index) => (
          <li key={item.id} className="group" data-row={item.id}>
            <div className="flex items-center gap-2 rounded-2xl py-1.5 group-data-[lifted]:bg-surface group-data-[lifted]:px-2 group-data-[lifted]:shadow-overlay">
              <button
                {...drag.handleProps(index)}
                aria-label={labels.move(item.name, index + 1, items.length)}
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
              {item.thumbnail}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                {index === 0 && <span className="truncate text-xs text-muted">{labels.cover}</span>}
                {item.note}
              </span>
              <Button
                isIconOnly
                aria-label={labels.remove(item.name)}
                className="shrink-0 text-danger max-lg:size-11"
                size="sm"
                variant="tertiary"
                onPress={() => onChange(ids.filter(id => id !== item.id))}
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
