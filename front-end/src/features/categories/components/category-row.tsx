import type { CategoryKind, MerchantCategory } from '@sk/api-contract'

import { Button } from '@heroui/react'

import { ChevronDownIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { displayName, OTHER } from '../lib/category-name'

/**
 * One category: its name (the other language as a fallback and as secondary text, with a notice for a language
 * it lacks), where it sits, its counts, and the four actions. A sub-category is indented under its parent.
 */
export function CategoryRow({ category, kind, parentName, canMoveUp, canMoveDown, busy, onMove, onEdit, onDelete }: {
  category: MerchantCategory
  kind: CategoryKind
  parentName: string | undefined
  canMoveUp: boolean
  canMoveDown: boolean
  busy: boolean
  onMove: (direction: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t, language } = useLocale()
  const { primary, secondary } = displayName(category, language)
  const missing = (['en', 'de'] as const).filter(code => category.name[code] === null)

  return (
    <li
      className={`flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface ${category.parentId === null ? '' : 'ml-4'}`}
      data-category={category.id}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium break-words">{primary}</span>
        {secondary !== null && <span className="text-xs break-words text-muted">{t(`categories.otherName.${OTHER[language]}`, { name: secondary })}</span>}
        {parentName !== undefined && <span className="text-xs break-words text-muted">{t('categories.parentOf', { name: parentName })}</span>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          {category.parentId === null && <span>{t('categories.count.children', { n: category.childCount })}</span>}
          <span>{t(`categories.count.${kind}`, { n: category.useCount })}</span>
        </div>
        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {missing.map(code => <StatusChip key={code} tone="neutral">{t(`categories.noName.${code}`)}</StatusChip>)}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button isIconOnly aria-label={t('categories.moveUp', { name: primary })} className="min-h-11 min-w-11" isDisabled={!canMoveUp || busy} variant="secondary" onPress={() => onMove(-1)}>
          <ChevronDownIcon className="rotate-180" size={18} />
        </Button>
        <Button isIconOnly aria-label={t('categories.moveDown', { name: primary })} className="min-h-11 min-w-11" isDisabled={!canMoveDown || busy} variant="secondary" onPress={() => onMove(1)}>
          <ChevronDownIcon size={18} />
        </Button>
        <Button aria-label={t('categories.editLabel', { name: primary })} className="min-h-11" variant="secondary" onPress={onEdit}>{t('categories.edit')}</Button>
        <Button aria-label={t('categories.deleteLabel', { name: primary })} className="min-h-11" variant="tertiary" onPress={onDelete}>{t('categories.delete')}</Button>
      </div>
    </li>
  )
}
