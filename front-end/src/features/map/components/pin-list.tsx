import type { PublicCategory, PublicMapItem } from '@sk/api-contract'

import { useLocale } from '@/contexts/locale-context'
import { pinCategoryNames } from '@/features/map/lib/categories'
import { nextDateLine, zurichToday } from '@/features/map/lib/next-date'
import { PinThumb } from './pin-marker'

/**
 * The places the filter keeps as a ranked list: the alternative for screen readers and keyboards
 * (AC93). A row opens the same place card as a pin does.
 */
export function PinList({
  pins,
  categories,
  onOpen,
}: {
  pins: PublicMapItem[]
  categories: PublicCategory[]
  onOpen: (id: string) => void
}) {
  const { t, language, intlLocale } = useLocale()
  const today = zurichToday(new Date())

  return (
    <ul className="flex flex-col">
      {pins.map((pin) => {
        const date = pin.nextDate
          ? nextDateLine(pin.nextDate, today, intlLocale, {
              until: day => t('map.date.until', { day }),
              from: time => t('map.date.from', { time }),
            })
          : undefined
        const facts = [date, ...pinCategoryNames(pin, categories, language)].filter(Boolean).join(' · ')

        return (
          <li key={pin.id}>
            <button
              className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl px-1 py-2 text-start outline-none focus-visible:focus-ring active:bg-default"
              data-pin-return={pin.id}
              type="button"
              onClick={() => onOpen(pin.id)}
            >
              <PinThumb className="size-14 shrink-0 rounded-xl" iconSize={22} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-serif text-base leading-5 text-balance" lang={pin.language}>{pin.title}</span>
                {facts && <span className="truncate text-label text-muted tabular-nums">{facts}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
