import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { AdviceBanner } from '@/features/discovery/components/advice-banner'
import { VictorinoxShowcase } from '@/features/discovery/components/victorinox-showcase'

/**
 * The ending of the home: the shipped Victorinox showcase with prices hidden, a thread that drops from its lake blue with one
 * handing-over line and ends on a red dot, then the shipped advice banner (it opens the demo advice form). Both are unchanged.
 * With `onRetry` the keepsake read has failed: an error with retry stands in for the showcase, and the thread and the banner stay.
 */
export function HomeEnding({ items, isLoading, onRetry }: { items: ProductCardProps[], isLoading: boolean, onRetry?: () => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col">
      {onRetry
        ? <ErrorNotice compact message={t('homePage.ending.failed')} onRetry={onRetry} />
        : (
            <VictorinoxShowcase
              hidePrice
              eyebrow={t('home.victorinox.eyebrow')}
              intro={t('home.victorinox.intro')}
              isLoading={isLoading}
              items={items}
              seeAll={t('homePage.ending.seeAll')}
              since={t('home.victorinox.fact1')}
              subtitle={t('home.victorinox.subtitle')}
              title={t('home.victorinox.title')}
            />
          )}
      <div className="flex flex-col items-center px-10">
        <span aria-hidden className="h-8 w-px bg-[linear-gradient(to_bottom,#173f52,var(--separator))]" />
        <p className="py-2 text-center font-serif text-[17px] leading-6 text-balance italic">{t('homePage.ending.line')}</p>
        <span aria-hidden className="h-6 w-px bg-separator" />
        <span aria-hidden className="size-2 rounded-full bg-accent" />
      </div>
      <AdviceBanner
        action={t('home.advice.action')}
        body={t('home.advice.body')}
        captions={[t('home.advice.caption1'), t('home.advice.caption2'), t('home.advice.caption3')]}
        title={t('home.advice.title')}
      />
    </div>
  )
}
