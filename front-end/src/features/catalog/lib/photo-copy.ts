/** The smallest resized copy at least `width` wide; undefined when none is that wide. */
export function photoCopy(variants: readonly { width: number, url: string }[], width: number): string | undefined {
  return [...variants].sort((a, b) => a.width - b.width).find(v => v.width >= width)?.url
}
