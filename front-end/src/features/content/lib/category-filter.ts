import type { PublicCategory, PublicLanguage } from '@sk/api-contract'

/** One chip of the filter row. `parent` is true for a top-level category. */
export interface OfferedCategory {
  slug: string
  label: string
  parent: boolean
}

const OTHER: Record<PublicLanguage, PublicLanguage> = { en: 'de', de: 'en' }

/** The name in the guest's language, else the other language's (ADR-030: a category always has one of the two). */
function labelOf(category: PublicCategory, language: PublicLanguage) {
  return category.name[language] ?? category.name[OTHER[language]] ?? category.slug
}

const byPosition = (a: PublicCategory, b: PublicCategory) => a.position - b.position

/**
 * The chips to offer (ADR-030, ADR-033), in position order with each sub-category right after its parent. A category is offered
 * when the API counts a published story for it (`storyCount`; a parent's count includes its sub-categories' stories).
 * The list is paged on the server, so the page cannot count the stories itself.
 */
export function offeredCategories(categories: readonly PublicCategory[], language: PublicLanguage): OfferedCategory[] {
  const used = categories.filter(c => c.storyCount > 0)

  return used
    .filter(c => c.parentId === null)
    .sort(byPosition)
    .flatMap(parent => [
      { slug: parent.slug, label: labelOf(parent, language), parent: true },
      ...used.filter(c => c.parentId === parent.id).sort(byPosition).map(c => ({ slug: c.slug, label: labelOf(c, language), parent: false })),
    ])
}

/** The slug that is really applied: the asked-for one when it is offered, else none (the list then shows every story). */
export function resolveCategory(offered: readonly OfferedCategory[], slug: string | undefined): string | null {
  return slug !== undefined && offered.some(o => o.slug === slug) ? slug : null
}
