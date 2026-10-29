import type { RefObject } from 'react'
import type { HandleProps } from './categories-level-drag'

import { GripIcon } from '@/components/icons'

/** The slot a dragged row will land in: the same dashed box as the tour sections. */
export function DropSlot({ ref }: { ref: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={ref}
      aria-hidden
      hidden
      className="pointer-events-none absolute inset-x-0 z-10 border-2 border-dashed border-accent bg-accent/10"
    />
  )
}

/**
 * The drag handle of the tour sections: six dots, a grab cursor, and ArrowUp or ArrowDown to move
 * one step from the keyboard. `onStep` gets the direction; focus stays on the handle.
 */
export function Grip({ label, id, props, onStep, onPointerDown }: {
  label: string
  /** Finds the handle again after the row moved, to give it the focus back. */
  id: string
  props: HandleProps
  onStep: (direction: -1 | 1) => void
  onPointerDown?: () => void
}) {
  return (
    <button
      {...props}
      aria-label={label}
      className="relative grid size-9 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing"
      data-grip={id}
      // Inline: globals.css gives every button `touch-action: manipulation`.
      style={{ touchAction: 'none' }}
      type="button"
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          // The table's own arrow-key navigation must not take the key.
          event.preventDefault()
          event.stopPropagation()
          onStep(event.key === 'ArrowUp' ? -1 : 1)
          requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-grip="${id}"]`)?.focus())
        }
        props.onKeyDown(event)
      }}
      onPointerDown={(event) => {
        onPointerDown?.()
        props.onPointerDown(event)
      }}
    >
      <GripIcon aria-hidden size={18} />
    </button>
  )
}
