import type { RefObject } from 'react'

import { useRef } from 'react'

import { useLatest } from '@/hooks/use-latest'
import { useStopDrag } from '@/hooks/use-stop-drag'

export type HandleProps = ReturnType<ReturnType<typeof useStopDrag>['handleProps']>

/**
 * Drag to reorder one level of categories with the app's own mechanism (`useStopDrag`, the tour
 * sections and keepsakes, decisions.tsv 16.10.2026), unchanged. It reorders the children of a list;
 * here the "list" is whatever `rows()` returns when the drag starts: the parents, or the siblings
 * under one parent (table rows included), so a drag never leaves its level or its parent.
 * `onEnd` runs after every press, dropped or not.
 */
export function useLevelDrag({ placeholderRef, rows, onStart, onDrop, onEnd }: {
  /** The level's `DropSlot`. */
  placeholderRef: RefObject<HTMLDivElement | null>
  rows: () => HTMLElement[]
  onStart?: () => void
  onDrop: (from: number, to: number) => void
  onEnd?: () => void
}) {
  const latest = useLatest({ rows, onEnd })
  // `useStopDrag` reads `listRef.current.children` at each step; a getter hands it the rows of this level.
  const listRef = useRef({ get children() { return latest.current.rows() } })
  const drag = useStopDrag({
    listRef: listRef as unknown as RefObject<HTMLOListElement | null>,
    placeholderRef,
    onStart: () => onStart?.(),
    onDrop,
  })
  const end = () => latest.current.onEnd?.()

  return {
    handleProps: (index: number): HandleProps => {
      const props = drag.handleProps(index)

      return {
        ...props,
        onPointerUp: (event) => {
          props.onPointerUp(event)
          end()
        },
        onPointerCancel: (event) => {
          props.onPointerCancel(event)
          end()
        },
        onLostPointerCapture: () => {
          props.onLostPointerCapture()
          end()
        },
      }
    },
  }
}
