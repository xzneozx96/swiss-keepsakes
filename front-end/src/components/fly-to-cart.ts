/**
 * Add-to-cart micro-interaction: a small photo of the item flies on a short arc from
 * the add button into the visible cart button. The cart badge waits for `cartFlight()`
 * before it shows the new count, so the count changes as the item drops in.
 * Transform and opacity only, on a node outside the layout. Skipped with reduced motion
 * or when no cart button is on screen.
 */

const DURATION = 650
const SIZE = 40
/** How far above the cart button the item ends its arc before it drops in. */
const DROP = 28

let flight: Promise<void> = Promise.resolve()
let added = false

/** True once the guest has added something on this page, so the cart badge can tell an add from a restored cart. */
export function hasAddedToCart(): boolean {
  return added
}

/** Resolves when the current flight has landed (at once when nothing is flying). */
export function cartFlight(): Promise<void> {
  return flight
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** The cart button the guest can see: inside the viewport and not in a hidden bar. */
function visibleCartButton(): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-cart-target]'),
  ).find((el) => {
    const r = el.getBoundingClientRect()

    return (
      !el.closest('[data-visible="false"]')
      && r.width > 0
      && r.bottom > 0
      && r.top < window.innerHeight
      && r.right > 0
      && r.left < window.innerWidth
    )
  })
}

/** Starts the flight from `from` (read now, before the caller closes a sheet). */
export function flyToCart(from: Element, photo: string | undefined): void {
  added = true

  const target = visibleCartButton()

  if (!target || prefersReducedMotion())
    return

  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)

  // Two nested nodes make the arc: the outer one moves across with ease-out, the inner
  // one rises first and then drops into the button.
  const outer = document.createElement('div')
  const inner = document.createElement(photo ? 'img' : 'div')

  outer.setAttribute('aria-hidden', 'true')
  outer.style.cssText = `position:fixed;z-index:100;pointer-events:none;left:${
    a.left + a.width / 2 - SIZE / 2
  }px;top:${a.top + a.height / 2 - SIZE / 2}px;width:${SIZE}px;height:${SIZE}px;`
  inner.className = photo
    ? 'size-full rounded-full object-cover shadow-overlay ring-2 ring-background'
    : 'size-full rounded-full bg-foreground'
  if (inner instanceof HTMLImageElement && photo) {
    inner.src = photo
    inner.alt = ''
  }
  outer.append(inner)
  document.body.append(outer)

  // Across: ease-out, so it leaves sideways first. Up: ease-in to just above the
  // button, then a short drop into it while shrinking away.
  const across = outer.animate(
    [
      { transform: 'translateX(0)' },
      { transform: `translateX(${dx}px)`, offset: 0.75 },
      { transform: `translateX(${dx}px)` },
    ],
    { duration: DURATION, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
  )
  const drop = inner.animate(
    [
      {
        transform: 'translateY(0) scale(1)',
        opacity: 1,
        easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)',
      },
      {
        transform: `translateY(${dy - DROP}px) scale(0.6)`,
        opacity: 1,
        offset: 0.75,
        easing: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      { transform: `translateY(${dy}px) scale(0.25)`, opacity: 0 },
    ],
    { duration: DURATION },
  )

  flight = Promise.all([across.finished, drop.finished])
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => outer.remove())
}
