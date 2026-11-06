import type { PublicTourList } from '@sk/api-contract'

import { useInfiniteQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/empty-state'
import { InfoIcon, TourIcon } from '@/components/icons'
import { InfiniteList } from '@/components/infinite-list'
import { CartButton, CompactBar } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { ListingCard } from '@/components/listing-card'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { coverSrc } from '@/features/content/lib/cover-src'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { publicToursQuery } from '../api/public-tours'

/** How long the pages of the list count as fresh. The API's pages are cached for 30 s (ADR-006), so the server's first page is not read again at once. */
const FRESH_MS = 30_000

/**
 * C08 Tours (ADR-033): the published tours from the API, one per row, ten a page with infinite scroll. `first` is the first page
 * the route read on the server (null when that read failed: an error with retry, never a demo tour). The count and the end line
 * come from the server's `total`. The cards carry no price and no departure: the API sends none.
 */
export function TourListPage({ first, lang, onRetry }: { first: PublicTourList | null, lang: 'en' | 'de', onRetry: () => void }) {
  const { t, intlLocale } = useLocale()
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const tours = useInfiniteQuery({
    ...publicToursQuery(lang),
    staleTime: FRESH_MS,
    enabled: first !== null,
    initialData: first ? { pages: [first], pageParams: [undefined] } : undefined,
  })
  const pages = tours.data?.pages ?? null
  // A tour that moved onto a later page while the guest scrolled shows once.
  const items = pages && [...new Map(pages.flatMap(page => page.items).map(tour => [tour.id, tour])).values()]
  const total = pages?.at(-1)?.total ?? 0
  const isOne = (count: number) => new Intl.PluralRules(intlLocale).select(count) === 'one'

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar title={t('tourDiscovery.title')} visible={scrolledPast}>
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo={items?.[0] ? coverSrc(items[0].cover) : undefined}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-end gap-2">
          <LanguageButton />
          <CartButton />
        </div>
        <header className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">
            {t('tourDiscovery.title')}
          </h1>
          <p className="text-body text-white/85">{t('tourDiscovery.intro')}</p>
          {total > 0 && <p className="text-label text-white/85 tabular-nums">{t(isOne(total) ? 'tourDiscovery.count.one' : 'tourDiscovery.count.other', { count: total })}</p>}
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {items === null
          ? <EmptyState alert action={{ label: t('routeError.retry'), onPress: onRetry }} icon={InfoIcon} message={t('tourDiscovery.error')} />
          : items.length === 0
            ? <EmptyState icon={TourIcon} message={t('tourDiscovery.empty')} />
            : (
                <InfiniteList
                  announce={added => t(isOne(added) ? 'tourDiscovery.more.one' : 'tourDiscovery.more.other', { count: added })}
                  count={items.length}
                  hasMore={tours.hasNextPage}
                  isFailed={tours.isFetchNextPageError}
                  isLoading={tours.isFetchingNextPage}
                  onLoadMore={() => void tours.fetchNextPage()}
                >
                  <ul className="flex flex-col gap-7">
                    {items.map(tour => (
                      <li key={tour.id}>
                        <ListingCard
                          // A tour in the other language than the guest's links to its own address (ADR-002).
                          lang={tour.language}
                          languageNote={tour.fallback ? t(tour.language === 'en' ? 'gifts.textInEnglish' : 'gifts.textInGerman') : undefined}
                          layout="grid"
                          metadata={[
                            tour.durationMinutes === null ? null : t('tourDiscovery.duration', { hours: new Intl.NumberFormat(intlLocale).format(tour.durationMinutes / 60) }),
                            tour.stopCount > 0 ? t('tourDiscovery.stops', { count: tour.stopCount }) : null,
                          ].filter(Boolean).join(' · ') || undefined}
                          name={tour.title}
                          photo={coverSrc(tour.cover)}
                          slug={tour.slug}
                          to="/$lang/tours/$slug"
                        />
                      </li>
                    ))}
                  </ul>
                </InfiniteList>
              )}
      </div>
    </div>
  )
}
