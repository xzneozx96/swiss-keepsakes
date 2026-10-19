import { useLayoutEffect, useRef } from 'react'

const DURATION = 200
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'

/**
 * Slides a bottom sheet out after it was removed from the page. Every sheet screen mounts its
 * sheet only while it is open, so closing unmounts it at once and HeroUI's exit state never
 * runs. Called as the sheet unmounts: a copy of the sheet stays for 200ms and slides down while
 * the backdrop fades, then goes. The copy cannot be touched or read out.
 */
export function playSheetExit(inside: HTMLElement) {
  const overlay = inside.closest<HTMLElement>('.drawer__backdrop')

  if (
    !overlay
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  const ghost = overlay.cloneNode(true) as HTMLElement
  const ghostDialog = ghost.querySelector<HTMLElement>('.drawer__dialog')

  if (!ghostDialog)
    return
  ghost.setAttribute('aria-hidden', 'true')
  ghost.inert = true
  ghost.style.pointerEvents = 'none'
  // The copy is a new element, so the slide-in keyframe would otherwise play again.
  ghostDialog.style.animation = 'none'
  document.body.appendChild(ghost)

  const timing = {
    duration: DURATION,
    easing: EASE,
    fill: 'forwards',
  } as const

  ghost.animate([{ opacity: 1 }, { opacity: 0 }], timing)
  ghostDialog
    .animate([{ translate: '0 0' }, { translate: '0 100%' }], timing)
    .finished
    .catch(() => undefined)
    .finally(() => ghost.remove())
}

/**
 * For the component that renders a bottom sheet and is itself removed when the sheet closes:
 * put `<span ref={markerRef} hidden />` inside the sheet's dialog and the sheet slides out as
 * the component goes. A component that stays mounted and toggles `isOpen` does not need it,
 * HeroUI's own exit runs there. Development's simulated unmount leaves the sheet in the page,
 * so only a sheet that is really gone slides out.
 */
export function useSheetExit() {
  const markerRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(
    () => () => {
      const marker = markerRef.current

      queueMicrotask(() => {
        if (marker && !marker.isConnected)
          playSheetExit(marker)
      })
    },
    [],
  )

  return markerRef
}
