import type { CategoryKind, MerchantCategory } from '@sk/api-contract'

import { useLocale } from '@/contexts/locale-context'
import { displayName } from '../lib/category-name'
import { childrenOf } from '../lib/category-tree'

/** Why the category cannot go yet, and what to do about each reason. It reads the counts the API sent. */
export function CategoryRefusal({ category, items, kind }: {
  category: MerchantCategory
  items: MerchantCategory[]
  kind: CategoryKind
}) {
  const { t, language } = useLocale()
  const children = childrenOf(items, category.id)
  const plural = (n: number) => (n === 1 ? 'one' : 'other')

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="note">
      <ul className="flex list-disc flex-col gap-1 ps-5">
        {category.childCount > 0 && (
          <li>
            {t(`categories.refusal.children.${plural(category.childCount)}`, {
              n: category.childCount,
              names: children.map(child => displayName(child, language).primary).join(', '),
            })}
          </li>
        )}
        {category.useCount > 0 && <li>{t(`categories.refusal.uses.${kind}.${plural(category.useCount)}`, { n: category.useCount })}</li>}
      </ul>
    </div>
  )
}
