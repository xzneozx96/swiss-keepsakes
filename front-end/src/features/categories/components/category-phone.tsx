import type { CategoryKind, MerchantCategory } from '@sk/api-contract'

import { useLocale } from '@/contexts/locale-context'
import { displayName } from '../lib/category-name'
import { rootsOf } from '../lib/category-tree'

/**
 * Phones, below 1024 px: the drill-in list of the parents. Part B completes it to the approved design
 * (a page per parent with names, usage, sub-categories and the delete checklist).
 */
export function CategoryPhone({ items }: {
  items: MerchantCategory[]
  kind: CategoryKind
}) {
  const { language } = useLocale()

  return (
    <ul className="flex flex-col gap-3" data-testid="category-phone">
      {rootsOf(items).map(category => (
        <li key={category.id} className="rounded-3xl bg-surface p-4 text-sm font-medium shadow-surface">{displayName(category, language).primary}</li>
      ))}
    </ul>
  )
}
