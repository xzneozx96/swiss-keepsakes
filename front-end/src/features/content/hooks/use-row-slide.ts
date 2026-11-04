import { useLayoutEffect, useRef } from 'react'

const SLIDE_MS = 300

const prefersReducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The slide when a list re-orders (onboarding design, "End of the flow"): only the rows that moved animate, each from the
 * place it had. Give each row `ref={slide(id)}`; pass the ids in their order so the hook knows when it changes.
 * Nothing slides under reduced motion. A row's `offsetTop` ignores scrolling, so a scroll between two orders does not look like a move.
 */
export function useRowSlide(order: readonly string[]) {
  const rowsRef = useRef(new Map<string, HTMLElement>())
  const topsRef = useRef(new Map<string, number>())
  const orderKey = order.join('|')

  useLayoutEffect(() => {
    const before = topsRef.current
    const after = new Map(Array.from(rowsRef.current, ([id, el]) => [id, el.offsetTop] as const))

    if (before.size > 0 && !prefersReducedMotion()) {
      for (const [id, top] of after) {
        const from = before.get(id)
        const el = rowsRef.current.get(id)
        if (from === undefined || from === top || typeof el?.animate !== 'function')
          continue
        el.animate([{ transform: `translateY(${from - top}px)` }, { transform: 'translateY(0)' }], { duration: SLIDE_MS, easing: 'ease-out' })
      }
    }
    topsRef.current = after
  }, [orderKey])

  return (id: string) => (el: HTMLElement | null) => {
    if (el)
      rowsRef.current.set(id, el)
    else
      rowsRef.current.delete(id)
  }
}
