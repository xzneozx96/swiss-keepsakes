import type { ReactNode } from 'react'

import { Button, Spinner } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, ResetIcon, StatusDangerIcon, TrashIcon } from '@/components/icons'
import { useStopDrag } from '@/hooks/use-stop-drag'

export interface PhotoOrderItem {
  id: string
  /** The row's name: the file's name, or "Photo 1" while it is not known. */
  name: string
  /** The 44 px picture; the row gives it the box. */
  thumbnail: ReactNode
  /** A line under the name, for a state ("Processing the photo…"). It renders its own live region. */
  note?: ReactNode
}

/** A photo that is not in the list yet: its file is on its way up, or the upload failed. It cannot be dragged and is never the cover. */
export interface PhotoOrderPending {
  id: string
  /** The row's name: the file's name. */
  name: string
  /** A local address of the picked file (`URL.createObjectURL`), so the row has its picture at once. The caller revokes it. */
  previewUrl: string
  status: 'uploading' | 'failed'
  /** The state in words under the name: "Uploading…" or "Upload failed". */
  label: string
  /** Why it failed, when there is more to say. */
  detail?: string
}

/** The pending rows, after the ordered ones in their own list. */
export interface PhotoOrderPendingList {
  items: PhotoOrderPending[]
  /** The name of the list for a screen reader: "Photos being added". */
  list: string
  /** The visible word on the button: "Retry". */
  retryText: string
  retry: (name: string) => string
  onRetry: (id: string) => void
  onRemove: (id: string) => void
}

/** The words a screen reader and the live region use; the caller owns the translation. */
export interface PhotoOrderLabels {
  list: string
  /** The line under the first row. Leave it out for a list whose first row is not special (keepsakes, stories). */
  cover?: string
  move: (name: string, position: number, count: number) => string
  moved: (name: string, position: number, count: number) => string
  remove: (name: string) => string
}

/**
 * The cover of a thumbnail that is not a finished picture: a spinner while the file is uploaded or processed, a warning
 * sign when it failed. The caller's thumbnail box must be `relative`.
 */
export function PhotoThumbOverlay({ failed = false }: { failed?: boolean }) {
  return (
    <span aria-hidden className="absolute inset-0 grid place-items-center bg-surface/70">
      {failed ? <StatusDangerIcon className="text-danger" size={18} /> : <Spinner size="sm" />}
    </span>
  )
}

function PendingRow({ item, pending, remove }: { item: PhotoOrderPending, pending: PhotoOrderPendingList, remove: (name: string) => string }) {
  const failed = item.status === 'failed'

  return (
    <li className="flex items-center gap-2 rounded-2xl py-1.5" data-pending={item.status} data-row={item.id}>
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full text-muted opacity-40 lg:size-9">
        <GripIcon size={18} />
      </span>
      <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
        <img alt="" className="absolute inset-0 size-full object-cover" height={44} src={item.previewUrl} width={44} />
        <PhotoThumbOverlay failed={failed} />
      </div>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium" title={item.name}>{item.name}</span>
        <span className={`truncate text-xs ${failed ? 'text-danger' : 'text-muted'}`} role={failed ? 'alert' : 'status'}>{item.label}</span>
        {item.detail && <span className="text-xs text-pretty text-muted">{item.detail}</span>}
      </span>
      {failed && (
        <Button aria-label={pending.retry(item.name)} className="shrink-0 max-lg:min-h-11" size="sm" variant="tertiary" onPress={() => pending.onRetry(item.id)}>
          <ResetIcon aria-hidden size={16} />
          {pending.retryText}
        </Button>
      )}
      <Button
        isIconOnly
        aria-label={remove(item.name)}
        className="shrink-0 text-danger max-lg:size-11"
        size="sm"
        variant="tertiary"
        onPress={() => pending.onRemove(item.id)}
      >
        <TrashIcon aria-hidden size={16} />
      </Button>
    </li>
  )
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
 * gets the ids in their new order, or without the removed one. Photos still on their way up (`pending`) are rows after
 * the list, with their own picture, state, Retry and Remove; they are not in the order and are never the cover.
 */
export function PhotoOrder({ items, labels, pending, onChange }: { items: PhotoOrderItem[], labels: PhotoOrderLabels, pending?: PhotoOrderPendingList, onChange: (ids: string[]) => void }) {
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
      {items.length > 0 && (
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
                  <span className="truncate text-sm font-medium" title={item.name}>{item.name}</span>
                  {index === 0 && labels.cover && <span className="truncate text-xs text-muted">{labels.cover}</span>}
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
      )}
      {pending && pending.items.length > 0 && (
        <ul aria-label={pending.list} className="flex flex-col">
          {pending.items.map(item => <PendingRow key={item.id} item={item} pending={pending} remove={labels.remove} />)}
        </ul>
      )}
      {/* The slot a dragged row will land in (see useStopDrag). */}
      <div ref={placeholderRef} aria-hidden hidden className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10" />
      <p aria-live="polite" className="sr-only" role="status">{announcement}</p>
    </div>
  )
}
