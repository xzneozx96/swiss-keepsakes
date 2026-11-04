import type { PublicCategory, PublicLanguage, PublicStoryCard } from '@sk/api-contract'

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
 * The chips to offer (ADR-030), in position order with each sub-category right after its parent. A category is offered when
 * a story in `stories` has it, or (for a parent) one of its sub-categories. A sub-category needs a story that has it itself.
 */
export function offeredCategories(
  categories: readonly PublicCategory[],
  stories: readonly PublicStoryCard[],
  language: PublicLanguage,
): OfferedCategory[] {
  const used = new Set(stories.flatMap(story => story.categories.map(c => c.id)))
  const children = (parent: PublicCategory) => categories.filter(c => c.parentId === parent.id).sort(byPosition)

  return categories
    .filter(c => c.parentId === null)
    .sort(byPosition)
    .flatMap((parent) => {
      const subs = children(parent).filter(c => used.has(c.id))
      const own = used.has(parent.id) || subs.length > 0 ? [{ slug: parent.slug, label: labelOf(parent, language), parent: true }] : []

      return [...own, ...subs.map(c => ({ slug: c.slug, label: labelOf(c, language), parent: false }))]
    })
}

/** The slug that is really applied: the asked-for one when it is offered, else none (the list then shows every story). */
export function resolveCategory(offered: readonly OfferedCategory[], slug: string | undefined): string | null {
  return slug !== undefined && offered.some(o => o.slug === slug) ? slug : null
}

/** The stories under one category: a parent keeps its sub-categories' stories too, a sub-category only its own. No slug keeps all. */
export function filterStories(
  stories: readonly PublicStoryCard[],
  categories: readonly PublicCategory[],
  slug: string | null,
): PublicStoryCard[] {
  const chosen = slug === null ? undefined : categories.find(c => c.slug === slug)
  if (!chosen)
    return [...stories]

  const ids = new Set([chosen.id, ...categories.filter(c => c.parentId === chosen.id).map(c => c.id)])

  return stories.filter(story => story.categories.some(c => ids.has(c.id)))
}
