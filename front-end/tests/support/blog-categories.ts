import type { PublicCategory } from '@sk/api-contract'

let n = 0

/** A public blog category as the API returns it; the name is English unless `de` is given. */
export function blogCategory(over: Partial<PublicCategory> & { slug: string }): PublicCategory {
  n += 1
  return {
    id: `0190b000-0000-7000-8000-${String(n).padStart(12, '0')}`,
    name: { en: over.slug, de: null },
    parentId: null,
    showOnHome: false,
    position: n,
    ...over,
  }
}

/** The category reference a story card carries. */
export const ref = (c: PublicCategory) => ({ id: c.id, slug: c.slug, name: c.name.en })
