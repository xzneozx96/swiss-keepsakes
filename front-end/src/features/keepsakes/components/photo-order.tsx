import type { Media } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { GripIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useStopDrag } from '@/hooks/use-stop-drag'
import { KeepsakePhoto } from './keepsake-photo'

function reorder(ids: string[], from: number, to: number) {
  const next = [...ids]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item!)

  return next
}

/**
 * The keepsake's photos in order, in the app's reorder pattern (the tour keepsakes list): a grip drags the row, the arrow
 * keys on the grip move it one step and keep the focus, and a live region says where it went. The first is the cover.
 */
export function PhotoOrder({ photos, onChange }: { photos: Media[], onChange: (ids: string[]) => void }) {
  const { t } = useLocale()
  const ids = photos.map(photo => photo.id)
  const listRef = useRef<HTMLOListElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)
  const refocusRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const nameOf = (index: number) => t('keepsakes.photos.name', { n: index + 1 })

  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || to === from)
      return
    refocusRef.current = ids[from]!
    onChange(reorder(ids, from, to))
    setAnnouncement(t('keepsakes.photos.moved', { name: nameOf(from), position: to + 1, count: ids.length }))
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
      <ol ref={listRef} aria-label={t('keepsakes.photos.list')} className="flex flex-col">
        {photos.map((photo, index) => (
          <li key={photo.id} className="group" data-row={photo.id}>
            <div className="flex items-center gap-2 rounded-2xl py-1.5 group-data-[lifted]:bg-surface group-data-[lifted]:px-2 group-data-[lifted]:shadow-overlay">
              <button
                {...drag.handleProps(index)}
                aria-label={t('keepsakes.photos.move', { name: nameOf(index), position: index + 1, count: photos.length })}
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
              <KeepsakePhoto className="size-11 shrink-0 rounded-xl" media={photo} width={160} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="line-clamp-2 text-sm font-medium">{nameOf(index)}</span>
                {index === 0 && <span className="truncate text-xs text-muted">{t('keepsakes.photos.cover')}</span>}
              </span>
              <Button
                isIconOnly
                aria-label={t('keepsakes.photos.remove', { name: nameOf(index) })}
                className="shrink-0 text-danger max-lg:size-11"
                size="sm"
                variant="tertiary"
                onPress={() => onChange(ids.filter(x => x !== photo.id))}
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
