import type { CategoryIcon } from '@sk/api-contract'
import type { CategoryIconGroup } from '@sk/domain/content'
import type { MessageKey } from '@/i18n/en'

import { categoryIconGroups } from '@sk/domain/content'
/** The picker's groups and keys, in the order of the domain list. */
export const categoryIconGroupKeys: readonly CategoryIconGroup[] = categoryIconGroups.map(group => group.key)
export const categoryIconKeys: readonly CategoryIcon[] = categoryIconGroups.flatMap(group => group.icons)

export const iconLabelKey = (icon: CategoryIcon) => `categories.icon.${icon}` as MessageKey
export const categoryIconGroupLabelKey = (group: CategoryIconGroup) => `categories.iconGroup.${group}` as MessageKey
