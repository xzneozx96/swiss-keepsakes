import type { CategoryIcon } from '@sk/api-contract'

import { categoryIconComponents } from '../lib/category-icons'

/** The icon of a map category, drawn before its name. Nothing when the category has none. */
export function CategoryNameIcon({ icon }: { icon: CategoryIcon | null }) {
  if (icon === null)
    return null
  const Icon = categoryIconComponents[icon]

  return <Icon aria-hidden className="shrink-0 text-muted" size={16} />
}
