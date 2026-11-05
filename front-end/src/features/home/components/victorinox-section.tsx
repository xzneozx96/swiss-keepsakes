import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { VictorinoxShowcase } from '@/features/discovery/components/victorinox-showcase'
import { useVictorinoxItems } from '../hooks/use-victorinox-items'

/**
 * The shipped Victorinox showcase with prices hidden, unchanged. With `onRetry` the keepsake read has failed: an error with
 * retry stands in for the showcase.
 */
export function VictorinoxBlock({ items, isLoading, onRetry }: { items: ProductCardProps[], isLoading: boolean, onRetry?: () => void }) {
  const { t } = useLocale()

  return onRetry
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
      )
}

/** The showcase as a movable home section, with its own keepsake read. While the read is out it draws its skeleton; a failed read shows the error with retry. */
export function VictorinoxSection() {
  const { items, isPending, isFailed, retry } = useVictorinoxItems()

  return <VictorinoxBlock isLoading={isPending && !isFailed} items={items} onRetry={isFailed ? retry : undefined} />
}
