const ATTRIBUTION = '.maplibregl-ctrl-attrib'
const SHOWING = 'maplibregl-compact-show'
const INTERACTIONS = ['mousedown', 'touchstart', 'wheel', 'dragstart', 'keydown'] as const

/**
 * MapLibre opens the compact credits on load and folds them only after a drag. This folds them on the first
 * interaction of any kind (a click, a tap, the wheel, a drag, a key), so the credits are visible without any
 * interaction (the OpenStreetMap attribution guideline) and then give the map its room back. It runs once and removes
 * its listeners. A press on the credits themselves is the person choosing, so it leaves them as they are. Returns a
 * function that removes the listeners early (a map that is removed before anyone touched it).
 *
 * @param container The element the map was created in.
 */
export function foldCreditsOnFirstTouch(container: HTMLElement): () => void {
  const stop = () => INTERACTIONS.forEach(name => container.removeEventListener(name, onInteraction, true))

  function onInteraction(event: Event) {
    const credits = container.querySelector(ATTRIBUTION)

    if (!credits)
      return
    if (!(event.target instanceof Node && credits.contains(event.target)))
      credits.classList.remove(SHOWING)
    stop()
  }

  INTERACTIONS.forEach(name => container.addEventListener(name, onInteraction, { capture: true, passive: true }))

  return stop
}
