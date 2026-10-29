import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { Button, Checkbox, CheckboxGroup } from '@heroui/react'
import { useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { categoryName, countHighlighted, keepHighlighted, topLevelCategories } from '@/features/map/lib/categories'

/**
 * The category filter in the app's sheet: the top-level categories as checkbox rows (a parent
 * covers its sub-categories), a header row that ticks or clears all, Clear filter, and a button
 * that applies the choice with its count. Every category ticked is the same as no filter, so the
 * choice then comes back empty.
 */
export function CategoriesSheet({
  pins,
  categories,
  chosen,
  onApply,
  onClose,
}: {
  pins: PublicMapItem[]
  categories: PublicCategory[]
  /** Empty means All. */
  chosen: string[]
  onApply: (chosen: string[]) => void
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const top = topLevelCategories(categories)
  const topIds = top.map(category => category.id)
  const [draft, setDraft] = useState(() => chosen.length > 0 ? chosen : topIds)
  const allPicked = draft.length === topIds.length
  const count = allPicked ? pins.length : keepHighlighted(pins, draft, categories).length

  return (
    <SheetFrame
      footer={(
        <>
          <Button fullWidth isDisabled={draft.length === 0} size="lg" variant="primary" onPress={() => onApply(allPicked ? [] : draft)}>
            {t(count === 1 ? 'map.filter.show.one' : 'map.filter.show.other', { count })}
          </Button>
          <Button fullWidth isDisabled={allPicked} variant="tertiary" onPress={() => setDraft(topIds)}>
            {t('map.filter.clear')}
          </Button>
        </>
      )}
      isOpen
      title={t('map.filter.title')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">{draft.length === 0 ? t('map.filter.pickOne') : t('map.filter.hint')}</p>
        <div className="flex flex-col">
          {/* The header row ticks or clears every category, as a table's select-all does. */}
          <Checkbox
            className="min-h-12 border-b border-separator py-2"
            isIndeterminate={draft.length > 0 && !allPicked}
            isSelected={allPicked}
            onChange={() => setDraft(allPicked ? [] : topIds)}
          >
            <Checkbox.Content className="w-full flex-row items-center gap-3">
              <Checkbox.Control className="size-5 shrink-0 rounded-md">
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className="flex-1 font-semibold">{t('map.filter.all')}</span>
              <span className="text-sm text-muted tabular-nums">{pins.length}</span>
            </Checkbox.Content>
          </Checkbox>
          <CheckboxGroup
            aria-label={t('map.filter.title')}
            className="flex flex-col gap-0"
            value={draft}
            onChange={value => setDraft(topIds.filter(id => value.includes(id)))}
          >
            {top.map(category => (
              <Checkbox key={category.id} className="min-h-12 border-b border-separator py-2 last:border-b-0" value={category.id}>
                <Checkbox.Content className="w-full flex-row items-center gap-3">
                  <Checkbox.Control className="size-5 shrink-0 rounded-md">
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <span className="flex-1">{categoryName(category, language)}</span>
                  <span className="text-sm text-muted tabular-nums">{countHighlighted(pins, category.id, categories)}</span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </div>
      </div>
    </SheetFrame>
  )
}
