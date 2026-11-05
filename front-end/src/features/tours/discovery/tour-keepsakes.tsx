import { Skeleton } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { useLocale } from '@/contexts/locale-context'
import { firstKeepsakes } from '@/features/catalog/api/keepsake-list-query'
import { ProductCard } from '@/features/catalog/components/product-card'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { Rail } from '@/features/discovery/components/section'

/** Guests see at most this many linked keepsakes. */
export const MAX_TOUR_KEEPSAKES = 3

/**
 * A few real published keepsakes, as the ordinary cards of the keepsake list that open the keepsake page
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
            <Rail label={t('tourDiscovery.keepsakes.title')}>
              {items.map(item => (
                <li key={item.id} className="flex">
                  <ProductCard {...toKeepsakeCard(item, t)} layout="carousel" />
                </li>
              ))}
            </Rail>
          )
        : (
            <div aria-busy data-skeleton="tour-keepsakes">
              <Rail label={t('tourDiscovery.keepsakes.title')}>
                {Array.from({ length: MAX_TOUR_KEEPSAKES }, (_, i) => (
                  <li key={i} className="flex w-60 shrink-0 snap-start flex-col gap-2.5">
                    <Skeleton className="aspect-[4/3] rounded-3xl" />
                    <Skeleton className="h-5 w-4/5 rounded-lg" />
                  </li>
                ))}
              </Rail>
            </div>
          )}
    </section>
  )
}
