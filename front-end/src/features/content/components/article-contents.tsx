import type { ArticleSection } from '../types'

import { useEffect, useRef, useState } from 'react'

/** DOM id of a section; prefixed so seeded ids never clash with other ids on the page. */
export const sectionAnchor = (id: string) => `section-${id}`
/** Under the 56px compact bar; sections scroll into place below both bars. */
const STUCK_TOP = 'top-[calc(env(safe-area-inset-top,0px)+56px)]'
const ACTIVE_LINE = 132

function reduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * C20 contents bar (owner request 14.10.2026): one chip per section heading, sticky under
 * the top bar. The chip of the section being read is ink and scrolls into view; a thin ink
 * line shows how far through the story the reader is.
 */
export function ArticleContents({
  label,
  sections,
  bodyRef,
}: {
  label: string
  sections: ArticleSection[]
  /** The story body, start of the first section to end of the last. */
  bodyRef: React.RefObject<HTMLElement | null>
}) {
  const [active, setActive] = useState(sections[0]?.id)
  const listRef = useRef<HTMLUListElement>(null)
  // Written straight to the bar on each scroll frame, so reading never re-renders the nav.
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const current = sections
        .map(s => document.getElementById(sectionAnchor(s.id)))
        .filter((el): el is HTMLElement => el !== null)
        .filter(el => el.getBoundingClientRect().top <= ACTIVE_LINE)
        .pop()

      setActive(
        sections.find(s => sectionAnchor(s.id) === current?.id)?.id
        ?? sections[0]?.id,
      )
      const body = bodyRef.current?.getBoundingClientRect()

      if (body) {
        const read = (ACTIVE_LINE - body.top) / Math.max(body.height, 1)

        if (barRef.current)
          barRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, read))})`
      }
    }
    const onScroll = () => {
      if (!frame)
        frame = requestAnimationFrame(measure)
    }

    frame = requestAnimationFrame(measure)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [sections, bodyRef])

  // Keep the active chip visible inside the horizontally scrolling bar.
  useEffect(() => {
    const list = listRef.current
    const chip = list?.querySelector<HTMLElement>(`[data-section="${active}"]`)

    if (!list || !chip)
      return
    const left = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2

    list.scrollTo({ left, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [active])

  const jump = (id: string) => {
    document
      .getElementById(sectionAnchor(id))
      ?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' })
    setActive(id)
  }

  return (
    <nav
      aria-label={label}
      className={`sticky ${STUCK_TOP} z-20 -mx-6 border-b border-separator/70 bg-background`}
    >
      <ul
        ref={listRef}
        className="flex gap-2 overflow-x-auto px-6 py-2.5 [scrollbar-width:none]"
      >
        {sections.map((s) => {
          const isActive = s.id === active

          return (
            <li key={s.id} className="shrink-0">
              <button
                aria-current={isActive ? 'location' : undefined}
                className={`flex min-h-11 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:focus-ring ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'bg-surface-secondary text-foreground'
                }`}
                data-section={s.id}
                type="button"
                onClick={() => jump(s.id)}
              >
                {s.heading}
              </button>
            </li>
          )
        })}
      </ul>
      <div aria-hidden className="h-0.5 bg-separator/60">
        <div
          ref={barRef}
          className="h-full origin-left bg-foreground transition-transform duration-150 ease-out"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </nav>
  )
}
