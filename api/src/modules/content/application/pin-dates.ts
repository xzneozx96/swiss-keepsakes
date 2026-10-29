export { hasEnded, nextDate } from '@sk/domain/content'

// Each category plus its parent, once, sorted.
export function withParents(categoryIds: string[], parentOf: ReadonlyMap<string, string | null>): string[] {
  const all = new Set(categoryIds)

  for (const id of categoryIds) {
    const parent = parentOf.get(id)

    if (parent)
      all.add(parent)
  }

  return [...all].sort()
}
