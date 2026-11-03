/** Typing in a field, or pressing a button, of a block is not the editor's business: it must not move the selection or delete the block. */
export function stopEvent({ event }: { event: Event }): boolean {
  return event.target instanceof Element && event.target.closest('input, textarea, button') !== null
}
