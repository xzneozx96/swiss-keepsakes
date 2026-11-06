import type { ProductCardProps } from './product-card'
import type { InfiniteListProps } from '@/components/infinite-list'

import { Skeleton } from '@heroui/react'

import { EmptyState } from '@/components/empty-state'
import { GiftIcon, InfoIcon } from '@/components/icons'
import { InfiniteList } from '@/components/infinite-list'
import { CartButton, CompactBar } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useScrolledPast } from '@/hooks/use-scrolled-past'
import { ProductCard } from './product-card'

interface GiftListProps {
  banner: {
    title: string
    tagline: string
    /** Left out while the list is not ready. */
    countLabel?: string
    photo?: string
  }
  cards: ProductCardProps[]
  state: 'loading' | 'ready' | 'failed'
  onRetry: () => void
  /** The list loads on scroll (ADR-033, section 8). Left out, the cards are the whole list. `count` is `cards.length`. */
  paging?: Omit<InfiniteListProps, 'children' | 'count'>
}

/**
 * C02 Keepsakes, native-app layout: a full-bleed photo banner, then a sheet with the shared gift
 * cards, one per row (owner: few products, larger photos). The cards carry no price (AC54). The list
 * has three states: a skeleton that mirrors the cards, the cards (or the shared empty state when
 * the shop has none), and an error with a retry. A failed read never falls back to demo data.
 */
export function GiftList({ banner, cards, state, onRetry, paging }: GiftListProps) {
  const { t } = useLocale()
  const [bannerEnd, scrolledPast] = useScrolledPast<HTMLDivElement>()
  const list = (
    <ul className="flex flex-col gap-4">
      {cards.map(card => (
        <li key={card.slug}>
          <ProductCard {...card} variant="showcase" />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col">
      <CompactBar title={banner.title} visible={scrolledPast}>
        <LanguageButton tone="bar" />
        <CartButton tone="bar" />
      </CompactBar>
      <Media alt="" className="h-[260px]" photo={banner.photo}>
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/70"
        />
        {/* Actions top right (owner: no logo here, 13.10.2026). */}
        <div className="absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center justify-end gap-2">
          <LanguageButton />
          <CartButton />
        </div>
        <div className="absolute inset-x-4 bottom-10 flex flex-col gap-1 text-white">
          <h1 className="font-serif text-display">{banner.title}</h1>
          <p className="text-body text-white/85">{banner.tagline}</p>
          {banner.countLabel && (
            <p className="text-label text-white/85 tabular-nums">
              {banner.countLabel}
            </p>
          )}
        </div>
      </Media>
      <div ref={bannerEnd} aria-hidden className="h-px" />

      <div className="relative -mt-6 flex flex-col gap-5 rounded-t-3xl bg-background px-4 pt-5 pb-4">
        {state === 'loading' && (
          <ul aria-busy className="flex flex-col gap-4" data-skeleton="gifts">
            {/* The showcase card: a white card, the photo inset, then the name and line with the round arrow. */}
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="rounded-[28px] bg-surface shadow-surface">
                <Skeleton className="m-2 aspect-[4/3] rounded-[22px]" />
                <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-5">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-6 w-3/5 rounded-lg" />
                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                  </div>
                  <Skeleton className="size-11 shrink-0 rounded-full" />
                </div>
              </li>
            ))}
          </ul>
        )}
        {state === 'failed' && (
          <EmptyState
            alert
            action={{ label: t('routeError.retry'), onPress: onRetry }}
            icon={InfoIcon}
            message={t('routeError.message')}
          />
        )}
        {state === 'ready' && cards.length === 0 && (
          <EmptyState icon={GiftIcon} message={t('gifts.empty')} />
        )}
        {state === 'ready' && cards.length > 0 && (paging ? <InfiniteList {...paging} count={cards.length}>{list}</InfiniteList> : list)}
      </div>
    </div>
  )
}
