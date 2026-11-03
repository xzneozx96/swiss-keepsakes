export interface LabelBox {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}

/** Two labels that share more than this part of the smaller one are "heavily" overlapping. */
const HEAVY = 0.25

function overlapShare(a: LabelBox, b: LabelBox): number {
  const width = Math.min(a.right, b.right) - Math.max(a.left, b.left)
  const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)

  if (width <= 0 || height <= 0)
    return 0
  const smaller = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top))

  return smaller > 0 ? (width * height) / smaller : 0
}

/**
 * Which labels to hide so none overlaps heavily: the boxes come in rank order and a label that overlaps one already
 * kept is hidden, so the best-ranked pin keeps its name. Worked out when the camera stops, never per frame.
 */
export function hiddenLabels(boxes: readonly LabelBox[]): Set<string> {
  const kept: LabelBox[] = []
  const hidden = new Set<string>()

  for (const box of boxes) {
    if (kept.some(other => overlapShare(box, other) > HEAVY))
      hidden.add(box.id)
    else
      kept.push(box)
  }

  return hidden
}
