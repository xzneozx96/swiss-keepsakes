/**
 * The id of the product or tour that was just saved for the first time. Saving a new one swaps
 * the "new" screen for its own screen, which must start with the "saved" bar showing.
 */
let createdId: string | null = null

export function markJustCreated(id: string): void {
  createdId = id
}

/** True once for the id that was marked, so a later visit starts clean. */
export function takeJustCreated(id: string): boolean {
  const hit = createdId === id

  if (hit)
    createdId = null

  return hit
}
