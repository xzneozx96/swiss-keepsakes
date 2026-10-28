import { EmptyState } from '@/components/empty-state'

import { TourIcon } from '@/components/icons'
import { CartButton, CompactBar } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useTours } from '@/features/tours/hooks/use-tours'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { TourCard } from './tour-card'

export function TourListPage() {
  // A tour added in M13 stays off C08 until its first publish; the seeded Pilatus draft
  // still shows as "Coming soon" (owner note, 15.10.2026). An archived tour is gone.
  const tours = useTours().tours.filter(
    tour => !tour.unannounced && !tour.archivedAt,
  )
  const { t } = useLocale()
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()

  return (
    <div className="flex flex-1 flex-col">
      <CompactBar title={t('tourDiscovery.title')} visible={scrolledPast}>
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo={tours[0]?.photos[0]}>
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
        </header>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />
      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {tours.length === 0
          ? (
              <EmptyState icon={TourIcon} message={t('tourDiscovery.empty')} />
            )
          : (
              <ul className="flex flex-col gap-7">
                {tours.map(tour => (
                  <li key={tour.id}>
                    <TourCard tour={tour} />
                  </li>
                ))}
              </ul>
            )}
      </div>
    </div>
  )
}
