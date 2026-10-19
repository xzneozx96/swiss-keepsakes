import type { CardOptionProps } from '@/features/lab/card-options'

import { createFileRoute, Link } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import {
  productEarliestPickup,
  zurichDate,
} from '@/features/catalog/lib/pickup'
import { fromPrice } from '@/features/catalog/lib/stock'
import { useDemo, useDemoNow } from '@/features/demo'
import {
  OptionBorderless,
  OptionCompact,
  OptionOverlay,
  OptionPricePill,
  OptionRow,
} from '@/features/lab/card-options'
import { formatMoney, formatShortDate } from '@/lib/format'
import { pickText } from '@/lib/localized'

/** Lab: compare gift-card layouts at phone width. Not part of the product. */
export const Route = createFileRoute('/lab/cards')({ component: CardLab })

const sampleIds = [
  'p-chocolate',
  'p-vx-chapel-bridge',
  'p-swiss-chocolate-box',
]

const options = [
  {
    id: 'A',
    title: 'A · Borderless (Airbnb)',
    note: 'Square photo, text on the page ground, no card surface.',
    Card: OptionBorderless,
  },
  {
    id: 'B',
    title: 'B · Photo overlay',
    note: 'Tall photo with name and price on a dark scrim, like the tour cards.',
    Card: OptionOverlay,
  },
  {
    id: 'C',
    title: 'C · Compact card',
    note: 'Surface card: one price line, clock icon.',
    Card: OptionCompact,
  },
  {
    id: 'D',
    title: 'D · Price on the photo (chosen)',
    note: 'Borderless; the price sits in a pill on the image. Used by ProductCard.',
    Card: OptionPricePill,
  },
  {
    id: 'E',
    title: 'E · List row',
    note: 'Thumbnail beside the text; for lists and search results.',
    Card: OptionRow,
  },
]

function CardLab() {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const now = useDemoNow()
  const today = zurichDate(now)

  const samples: CardOptionProps[] = sampleIds
    .map(id => state.data.products.find(p => p.id === id))
    .filter(p => p !== undefined)
    .map(p => ({
      name: pickText(p.name, language).text,
      photo: p.photo,
      fromLabel: t('home.from'),
      price: formatMoney(fromPrice(p) / 100, intlLocale),
      pickupLine: t('home.earliestPickup', {
        date: formatShortDate(productEarliestPickup(p, now), today, intlLocale),
      }),
      badge: p.engraving ? t('home.engravingBadge') : undefined,
    }))

  return (
    <div className="flex flex-1 justify-center bg-default/40 py-6">
      <div className="flex w-[375px] flex-col gap-8 bg-background py-6 shadow-overlay">
        <header className="flex flex-col gap-1 px-4">
          <Link
            className="text-label text-muted underline underline-offset-4"
            to="/lab"
          >
            Lab
          </Link>
          <h1 className="text-heading">Gift card options</h1>
          <p className="text-sm text-muted">
            Same three gifts in each layout, at phone width (375px). Scroll each
            row sideways.
          </p>
        </header>
        {options.map(({ id, title, note, Card }) => (
          <section key={id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-4">
              <h2 className="text-heading">{title}</h2>
              <p className="text-label text-muted">{note}</p>
            </div>
            <ul className="flex gap-3 overflow-x-auto px-4 pb-2">
              {samples.map(sample => (
                <li key={sample.name} className="shrink-0">
                  <Card {...sample} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
