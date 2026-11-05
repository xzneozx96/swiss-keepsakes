import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { Button, Checkbox, CheckboxGroup } from '@heroui/react'
import { useState } from 'react'

import { ChevronDownIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { categoryName, countHighlighted, keepHighlighted, subCategories, topLevelCategories } from '@/features/map/lib/categories'
import { setChildren, tickedChildren, toggleParent } from '@/features/map/lib/category-selection'

/**
 * The category filter in the app's sheet: the top-level categories as checkbox rows (a parent
 * covers its sub-categories, and a chevron opens them as rows of their own), a header row that ticks or clears all, Clear filter, and a button
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
  // A parent opens by itself when the address chose one of its sub-categories; the rest start collapsed.
  const [open, setOpen] = useState(() => new Set(top.filter(category => !chosen.includes(category.id) && subCategories(categories, category.id).some(child => chosen.includes(child.id))).map(category => category.id)))
  const allPicked = topIds.every(topId => draft.includes(topId))
  const count = allPicked ? pins.length : keepHighlighted(pins, draft, categories).length

  return (
    <SheetFrame
      footer={(
        <>
          <Button fullWidth isDisabled={draft.length === 0} size="lg" variant="primary" onPress={() => onApply(allPicked ? [] : draft)}>
            {t(count === 1 ? 'map.filter.show.one' : 'map.filter.show.other', { count })}
          </Button>
          <Button
            fullWidth
            isDisabled={allPicked}
            variant="tertiary"
            onPress={() => setDraft(topIds)}
          >
            {t('map.filter.clear')}
          </Button>
        </>
      )}
      isOpen
      title={t('map.filter.title')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        {/* Only the empty choice needs a word; that the other places stay dimmed is plain on the map (owner, 05.11.2026). */}
        {draft.length === 0 && <p className="text-sm text-muted">{t('map.filter.pickOne')}</p>}
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
          {top.map((category) => {
            const children = subCategories(categories, category.id)
            const ticked = tickedChildren(draft, category.id, categories)
            const isOpen = open.has(category.id)
            const name = categoryName(category, language)

            return (
              <div key={category.id} className="border-b border-separator last:border-b-0">
                <div className="flex items-center gap-1">
                  <Checkbox
                    className="min-h-12 flex-1 py-2"
                    isIndeterminate={!draft.includes(category.id) && ticked.length > 0}
                    isSelected={draft.includes(category.id)}
                    onChange={() => setDraft(toggleParent(draft, category.id, categories))}
                  >
                    <Checkbox.Content className="w-full flex-row items-center gap-3">
                      <Checkbox.Control className="size-5 shrink-0 rounded-md">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <span className="flex-1">{name}</span>
                      <span className="text-sm text-muted tabular-nums">{countHighlighted(pins, category.id, categories)}</span>
                    </Checkbox.Content>
                  </Checkbox>
                  {children.length > 0 && (
                    <button
                      aria-expanded={isOpen}
                      aria-label={t('map.filter.subcategories', { name })}
                      className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted outline-none focus-visible:focus-ring"
                      type="button"
                      onClick={() => setOpen(current => isOpen ? new Set([...current].filter(id => id !== category.id)) : new Set(current).add(category.id))}
                    >
                      <ChevronDownIcon aria-hidden className={`transition-transform duration-200 ease-out ${isOpen ? 'rotate-180' : ''}`} size={16} />
                    </button>
                  )}
                </div>
                {/* Each sub-category row has mt-0: the HeroUI group puts 16 px between its checkboxes, and the rows have their own height. */}
                {children.length > 0 && isOpen && (
                  <CheckboxGroup
                    aria-label={name}
                    className="flex flex-col gap-0 ps-8"
                    value={ticked}
                    onChange={value => setDraft(setChildren(draft, category.id, value, categories))}
                  >
                    {children.map(child => (
                      <Checkbox key={child.id} className="mt-0 min-h-12 py-2" value={child.id}>
                        <Checkbox.Content className="w-full flex-row items-center gap-3">
                          <Checkbox.Control className="size-5 shrink-0 rounded-md">
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="flex-1">{categoryName(child, language)}</span>
                          <span className="text-sm text-muted tabular-nums">{countHighlighted(pins, child.id, categories)}</span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </SheetFrame>
  )
}
