import type { PublicKeepsake, PublicLanguage } from '@sk/api-contract'
import type { GiftDetailProps } from '../components/gift-detail'
import type { AvailabilityView } from '../lib/keepsake-page'
import type { Chosen } from '../lib/variant-choice'

import { formatMoney } from '@sk/domain/shared'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { fetchAvailability } from '../api/keepsake'
import { publicKeepsakePage } from '../lib/keepsake-page'
import { settleChoice } from '../lib/variant-choice'
import { useFavourite } from './use-favourites'

/** Price and units change with every order, so they are read again after a few seconds, never served from the page. */
const AVAILABILITY_STALE_MS = 5_000

/**
 * C03 Gift detail on the public API: the text, photos and options come from the server-rendered detail; the price and
 * the units are read in the browser only (AC54), with a skeleton, then the price, or an error with a retry. Adding to
 * the cart is a placeholder until release 4: the button does nothing.
 */
export function useKeepsakeDetail(detail: PublicKeepsake, lang: PublicLanguage): Omit<GiftDetailProps, 'onBack'> {
  const { t, intlLocale, preferredLanguage } = useLocale()
  const { saved, toggle } = useFavourite(detail.id)
  const [picked, setPicked] = useState<Chosen>()
  const [quantity, setQuantity] = useState(1)

  const read = useQuery({
    queryKey: ['public-keepsake-availability', detail.slug, lang],
    queryFn: () => fetchAvailability(detail.slug, lang),
    staleTime: AVAILABILITY_STALE_MS,
    retry: false,
  })
  const availability: AvailabilityView = read.data
    ? { state: 'ready', byVariant: new Map(read.data.items.map(item => [item.variantId, item])) }
    : { state: read.isError && !read.isFetching ? 'failed' : 'loading' }

  const { page, variant, choice, soldOut } = publicKeepsakePage({ ...detail, fallback: preferredLanguage !== undefined && !detail.availableLanguages.includes(preferredLanguage) }, { t, intlLocale, availability, chosen: picked })
  const max = Math.max(1, choice?.available ?? 1)
  const count = Math.min(quantity, max)
  const total = choice ? formatMoney((choice.priceRappen * count) / 100, intlLocale) : undefined
  const ready = availability.state === 'ready'

  return {
    ...page,
    favourite: { isSaved: saved, onToggle: toggle, label: t(saved ? 'card.unsave' : 'card.save', { name: page.name }) },
    soldOut: soldOut
      ? { label: t('gifts.soldOut'), message: t('detail.soldOut.message'), actionLabel: t('detail.soldOut.action') }
      : undefined,
    sheet: {
      ...page.sheet,
      addLabel: total ? t('detail.sheet.add', { total }) : t('detail.bar.add'),
      addDisabled: !choice,
    },
    variant: {
      ...variant,
      onChange: (optionId, valueId) => setPicked(settleChoice(variant.options, variant.variants, variant.chosen, optionId, valueId)),
    },
    quantity: {
      label: t('detail.quantity.label'),
      value: count,
      max,
      hint: choice ? t('detail.quantity.available', { count: choice.available }) : undefined,
      onChange: setQuantity,
    },
    bar: {
      price: total ?? '',
      summary: t('detail.preview.atCheckout'),
      chip: t('detail.bar.nothingNow'),
      addLabel: t('detail.bar.add'),
      addDisabled: !ready,
      viewCartLabel: t('detail.bar.viewCart'),
      priceState: ready
        ? undefined
        : availability.state === 'failed'
          ? { error: t('detail.price.failed'), retryLabel: t('routeError.retry'), onRetry: () => void read.refetch() }
          : 'loading',
    },
    onAdd: () => false,
    onSheetOpen: () => {},
    backLabel: t('detail.back'),
  }
}
