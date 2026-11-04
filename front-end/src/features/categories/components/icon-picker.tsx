import type { CategoryIcon } from '@sk/api-contract'

import { Description, Label, Radio, RadioGroup } from '@heroui/react'
import { categoryIconGroups } from '@sk/domain/content'

import { choiceCard } from '@/components/choice-card'
import { useLocale } from '@/contexts/locale-context'
import { categoryIconComponents, categoryIconGroupLabelKey, iconLabelKey } from '../lib/category-icons'

const NO_ICON = 'none'

/**
 * The icon choice of a map category: None first, then one radio group per group of the shared list with its label as
 * the heading. Each group is its own radio group, so the arrow keys move inside a group and Tab moves to the next.
 * Only the chosen icon's group has a checked radio.
 */
export function IconPicker({ value, onChange }: { value: CategoryIcon | null, onChange: (next: CategoryIcon | null) => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{t('categories.icon.label')}</span>
        <Description>{t('categories.icon.hint')}</Description>
      </div>
      <RadioGroup aria-label={t('categories.icon.label')} value={value === null ? NO_ICON : null} onChange={() => onChange(null)}>
        <Radio className={`${choiceCard} flex min-h-11 w-fit items-center px-3 py-0 text-sm`} value={NO_ICON}>
          <Radio.Content>{t('categories.icon.none')}</Radio.Content>
        </Radio>
      </RadioGroup>
      {categoryIconGroups.map(group => (
        <RadioGroup
          key={group.key}
          className="gap-2"
          value={value !== null && (group.icons as readonly CategoryIcon[]).includes(value) ? value : null}
          onChange={next => onChange(next as CategoryIcon)}
        >
          <Label className="text-xs font-medium text-muted">{t(categoryIconGroupLabelKey(group.key))}</Label>
          <div className="flex flex-wrap gap-2">
            {group.icons.map((key) => {
              const Icon = categoryIconComponents[key]

              return (
                <Radio key={key} className={`${choiceCard} flex size-11 items-center justify-center p-0`} value={key}>
                  <Radio.Content>
                    <Icon aria-hidden size={20} />
                    <Label className="sr-only">{t(iconLabelKey(key))}</Label>
                  </Radio.Content>
                </Radio>
              )
            })}
          </div>
        </RadioGroup>
      ))}
    </div>
  )
}
