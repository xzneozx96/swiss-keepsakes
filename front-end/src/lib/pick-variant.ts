interface Variant { width: number, url: string }

/**
 * The smallest resized copy at least `width` wide; undefined when none is that wide. The caller chooses the fallback: a gallery and an
 * editor preview take the original, a card takes the widest copy (`widestVariant`). The copies come smallest first by contract; the sort is only a guard.
 */
export function pickVariant<T extends Variant>(variants: readonly T[], width: number): T | undefined {
  return [...variants].sort((a, b) => a.width - b.width).find(variant => variant.width >= width)
}

/** The widest copy; undefined when there are none. */
export function widestVariant<T extends Variant>(variants: readonly T[]): T | undefined {
  return variants.reduce<T | undefined>((widest, variant) => !widest || variant.width > widest.width ? variant : widest, undefined)
}
