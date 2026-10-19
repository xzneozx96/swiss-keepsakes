import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import {
  ALL_CATEGORIES,
  GiftList,
} from '@/features/catalog/components/gift-list'
import { useProductCard } from '@/features/catalog/hooks/use-product-card'
import { isPublished } from '@/features/catalog/lib/publish'
import { useDemo } from '@/features/demo'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { useUrlInput } from '@/hooks/use-url-input'
import { pickText } from '@/lib/localized'

interface GiftsSearch {
  /** Sub-category from the discovery home or the filter rail; absent = all keepsakes. */
  subcategory?: string
  /** Free-text search from the home search pill or the search field. */
  q?: string
}

// C02 Gifts: list, category filter and search.
export const Route = createFileRoute('/_guest/gifts/')({
  validateSearch: (search: Record<string, unknown>): GiftsSearch => {
    // The store's own sub-categories are in demo state, so the page checks the id.
    const subcategory
      = typeof search.subcategory === 'string' && search.subcategory
        ? search.subcategory
        : undefined
    const q
      = typeof search.q === 'string' && search.q.trim() ? search.q : undefined

    return { ...(subcategory && { subcategory }), ...(q && { q }) }
  },
  component: GiftsPage,
})

function GiftsPage() {
  const { t, language, intlLocale } = useLocale()
  const { state } = useDemo()
  const { subcategory, q = '' } = Route.useSearch()
  const navigate = useNavigate({ from: '/gifts/' })
  const toCard = useProductCard()
  const isLoading = useSimulatedLoading()
  const { value, setValue, deferred } = useUrlInput(
    q,
    next =>
      void navigate({
        search: prev => ({ ...prev, q: next || undefined }),
        replace: true,
      }),
  )

  // Only sub-categories a guest can buy from: at least one published keepsake in them.
  const giftCategories = state.data.subcategories.filter(
    c =>
      c.categoryId === 'keepsakes'
      && state.data.products.some(
        p => p.subcategoryId === c.id && isPublished(p),
      ),
  )
  const selected = giftCategories.find(c => c.id === subcategory)
  const query = deferred.trim().toLocaleLowerCase(intlLocale)
  const cards = state.data.products
    // A draft from M12 is hidden from guests (4.9).
    .filter(
      p => isPublished(p) && (!selected || p.subcategoryId === selected.id),
    )
    .map(toCard)
    .filter(
      c => !query || c.name.toLocaleLowerCase(intlLocale).includes(query),
    )
    // Available gifts first, soonest pickup first; sold-out gifts last (still shown, spec C02).
    .sort(
      (a, b) =>
        Number(a.soldOut) - Number(b.soldOut)
        || a.pickup.localeCompare(b.pickup),
    )

  const plural = new Intl.PluralRules(intlLocale)
  const countLabel = t(
    plural.select(cards.length) === 'one'
      ? 'gifts.count.one'
      : 'gifts.count.other',
    {
      count: cards.length,
    },
  )

  const empty
    = cards.length > 0
      ? null
      : {
          message: query
            ? t('gifts.noResults', { query: deferred.trim() })
            : t('gifts.emptyCategory'),
          actionLabel: t('gifts.showAll'),
        }

  return (
    <GiftList
      banner={{
        title: selected
          ? pickText(selected.name, language).text
          : t('gifts.title'),
        tagline: selected?.tagline
          ? pickText(selected.tagline, language).text
          : t('gifts.tagline'),
        countLabel,
        photo: selected?.photo ?? 'lucerne-kapellbruecke-1200',
      }}
      cards={cards}
      empty={empty}
      filter={{
        label: t('gifts.filterLabel'),
        items: [
          {
            id: ALL_CATEGORIES,
            name: t('gifts.all'),
            photo: 'lucerne-kapellbruecke-1200',
          },
          ...giftCategories.map(c => ({
            id: c.id,
            name: pickText(c.name, language).text,
            photo: c.photo,
          })),
        ],
        selected: selected?.id ?? ALL_CATEGORIES,
        onChange: id =>
          void navigate({
            search: prev => ({
              ...prev,
              subcategory: id === ALL_CATEGORIES ? undefined : id,
            }),
            replace: true,
          }),
      }}
      isLoading={isLoading}
      search={{
        label: selected
          ? t('search.inCategory', {
              category: pickText(selected.name, language).text,
            })
          : t('search.inGifts'),
        openLabel: t('search.open'),
        backLabel: t('search.back'),
        value,
        onChange: setValue,
      }}
    />
  )
}
