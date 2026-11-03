/**
 * After a step, the pressed button may be disabled (the first or last card ends the steps): keep focus on
 * the button that still works, so a keyboard user can carry on or go back. `scope` holds the card's buttons.
 */
export function focusStepButton(scope: ParentNode | null | undefined, delta: 1 | -1, target: number, count: number) {
  const direction = delta > 0 ? 'next' : 'previous'
  const atEnd = target === 0 || target === count - 1

  requestAnimationFrame(() => scope?.querySelector<HTMLButtonElement>(`[data-step="${atEnd ? (delta > 0 ? 'previous' : 'next') : direction}"]`)?.focus())
}
