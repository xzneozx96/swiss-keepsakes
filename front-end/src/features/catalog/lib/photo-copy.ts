/** The smallest resized copy at least `width` wide, else the widest one; undefined when there is no copy. */
export function photoCopy(variants: readonly { width: number, url: string }[], width: number): string | undefined {
  const sorted = [...variants].sort((a, b) => a.width - b.width)

  return (sorted.find(v => v.width >= width) ?? sorted.at(-1))?.url
}
