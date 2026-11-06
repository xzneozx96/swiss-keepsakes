/** The classes of a sideways track that snaps one slide at a time (native scroll snap, no scrollbar). Add the size yourself. */
export const snapTrackClass
  = 'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

/** Index of the slide that fills the scroller, from its scroll position. */
export function slideIndex(el: HTMLElement) {
  return Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
}
