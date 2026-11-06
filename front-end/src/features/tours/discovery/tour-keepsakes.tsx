import { Skeleton } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@/contexts/locale-context'
import { firstKeepsakes } from '@/features/catalog/api/keepsake-list-query'
import { ProductCard } from '@/features/catalog/components/product-card'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'

/** Guests see at most this many linked keepsakes. */
export const MAX_TOUR_KEEPSAKES = 3

/**
 * A few real published keepsakes, as compact rows that open the keepsake page
 * (AC31, no price, AC54). Until the tour editor can pick them (E6.9) the block shows the first
 * MAX_TOUR_KEEPSAKES of the public list's first page, newest first. They are ordered separately, so there is no cart
 * button and nothing joins the booking. The list is read in the browser, so the server HTML never carries a
 * failed read. While it loads the block shows a skeleton of the cards; with none published, or when the read
 * fails, the block is not shown at all, heading included.
 */
export function TourKeepsakes({
  variant = 'page',
}: {
  /** "page" is C09's block near the end; "confirmation" is the light reminder on C13. */
  variant?: 'page' | 'confirmation'
}) {
  const { t, language } = useLocale()
  const list = useQuery({
    ...firstKeepsakes(language),
    select: ({ items }) => items.slice(0, MAX_TOUR_KEEPSAKES),
  })
  const items = list.data

  if (list.isError || (items && !items.length))
    return null
  const confirmation = variant === 'confirmation'

  return (
    <section
      aria-labelledby={`tour-keepsakes-${variant}`}
      className={`flex flex-col gap-3 ${confirmation ? '' : 'border-t border-separator py-7'}`}
    >
      <h2
        className={confirmation ? 'text-heading' : 'font-serif text-title'}
        id={`tour-keepsakes-${variant}`}
      >
        {t(
          confirmation
            ? 'tourDiscovery.keepsakes.confirmedTitle'
            : 'tourDiscovery.keepsakes.title',
        )}
      </h2>
      <p className="text-sm text-pretty text-muted">
        {t(
          confirmation
            ? 'tourDiscovery.keepsakes.confirmedIntro'
            : 'tourDiscovery.keepsakes.intro',
        )}
      </p>
      {items
        ? (
            <ul aria-label={t('tourDiscovery.keepsakes.title')} className="flex flex-col gap-3">
              {items.map(item => (
                <li key={item.id}>
                  <ProductCard {...toKeepsakeCard(item, t)} variant="row" />
                </li>
              ))}
            </ul>
          )
        : (
            <ul aria-busy className="flex flex-col gap-3" data-skeleton="tour-keepsakes">
              {/* The row: a white card with the square tile, two lines and the round arrow. */}
              {Array.from({ length: MAX_TOUR_KEEPSAKES }, (_, i) => (
                <li key={i} className="flex items-stretch gap-3.5 rounded-[22px] bg-surface p-2 shadow-surface">
                  <Skeleton className="size-[112px] shrink-0 rounded-2xl" />
                  <div className="flex min-w-0 flex-1 flex-col justify-between py-1.5 pe-1">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-5 w-3/5 rounded-lg" />
                      <Skeleton className="h-4 w-4/5 rounded-lg" />
                    </div>
                    <div className="flex justify-end">
                      <Skeleton className="size-9 rounded-full" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
    </section>
  )
}
