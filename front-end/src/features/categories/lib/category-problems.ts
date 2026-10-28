import type { MessageKey } from '@/i18n/en'

const byProblemType: Record<string, MessageKey> = {
  'category-has-children': 'categories.problem.hasChildren',
  'category-in-use': 'categories.problem.inUse',
  'category-too-deep': 'categories.problem.tooDeep',
  'category-parent-has-children': 'categories.problem.parentHasChildren',
  'validation-failed': 'categories.problem.name',
  'forbidden': 'categories.problem.forbidden',
  'not-found': 'categories.problem.notFound',
}

/**
 * The copy of an API problem on the category screen. An unknown type reads as the generic text. A reorder
 * is refused with `validation-failed` when the siblings changed under it, which is no name problem, so pass
 * `{ reorder: true }` for it.
 */
export function problemTypeToMessageKey(type: string, options: { reorder?: boolean } = {}): MessageKey {
  if (options.reorder && type === 'validation-failed')
    return 'categories.problem.listChanged'

  return byProblemType[type] ?? 'categories.problem.generic'
}
