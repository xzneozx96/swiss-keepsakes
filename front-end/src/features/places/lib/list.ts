import type { PinListItem } from '@sk/api-contract'
import type { Lang } from './form'
import type { StatusTone } from '@/components/status-chip'

export const NO_CATEGORY = 'none'
export const STATUSES = ['draft', 'published', 'hidden', 'ended'] as const
export const TYPE_FILTERS = ['place', 'event'] as const

/** The status chip's colour, the same in the list and in the editor's header. */
export const STATUS_TONE: Record<PinListItem['status'], StatusTone> = { draft: 'neutral', published: 'success', hidden: 'warning', ended: 'warning' }

/** The title in the dashboard's language, else the other one. `undefined` for a pin with no title yet. */
export function titleOf(item: Pick<PinListItem, 'title'>, language: Lang): string | undefined {
  return item.title[language] ?? item.title[language === 'en' ? 'de' : 'en']
}

/** The languages that carry a title, in the order EN, DE. */
export function languagesOf(item: Pick<PinListItem, 'title'>): Lang[] {
  return (['en', 'de'] as const).filter(lang => (item.title[lang] ?? '') !== '')
}

/** A pin with no date entries is a place; with dates it is an event, upcoming or current, or ended. Derived, never stored (ADR-029). */
export function kindOf(item: Pick<PinListItem, 'hasDates' | 'nextDate'>): 'place' | 'event' | 'ended' {
  if (!item.hasDates)
    return 'place'

  return item.nextDate ? 'event' : 'ended'
}
