import { useInfiniteQuery } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { loadDictionary, useLocale } from '@/contexts/locale-context'
import { publicKeepsakesQuery } from '@/features/catalog/api/keepsake-list-query'
import { KEEPSAKES_PAGE_SIZE, loadKeepsakesPage } from '@/features/catalog/api/keepsakes'
import { GiftList } from '@/features/catalog/components/gift-list'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { alternateHead } from '@/features/seo/lib/page-head'
import { isLanguage } from '@/lib/language-routing'

interface GiftsSearch {
  /** A product category slug, filtered on the server (a parent includes its direct sub-categories). */
  category?: string
  subcategory?: string
  q?: string
}

const BANNER_PHOTO = 'lucerne-kapellbruecke-1200'

/** How long the pages of the list count as fresh. The API's pages are cached for 30 s (ADR-006), so the server's first page is not read again at once. */
const FRESH_MS = 30_000

// C02 Keepsakes: the published list, no price (AC54). The first page (10) for the chosen category is read on the server, so the
// HTML carries it (ADR-033); the page loads the rest in the browser as the guest scrolls. The sub-category and search params of the
// demo list are still accepted so that an old link opens the list; the list ignores them (search is T-E4.14b).
export const Route = createFileRoute('/_guest/$lang/gifts/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): GiftsSearch => ({
    ...(typeof search.category === 'string' && search.category && { category: search.category }),
    ...(typeof search.subcategory === 'string' && search.subcategory && { subcategory: search.subcategory }),
    ...(typeof search.q === 'string' && search.q.trim() && { q: search.q }),
  }),
  // The category is a server filter, so a new one reads its own first page.
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ params, deps }) => {
    const lang = isLanguage(params.lang) ? params.lang : 'en'
    const dictionary = await loadDictionary(lang)
    const text = { title: dictionary['gifts.title'], description: dictionary['home.victorinox.subtitle'] }

    try {
      return { ...text, lang, state: 'ready' as const, first: await loadKeepsakesPage(lang, { category: deps.category, limit: KEEPSAKES_PAGE_SIZE }) }
    }
    // The page renders its own error state with a retry; the read is not repeated here.
    catch {
      return { ...text, lang, state: 'failed' as const, first: null }
    }
  },
  head: ({ loaderData }) => loaderData
    ? alternateHead({ lang: loaderData.lang, path: l => `/${l}/gifts`, title: `${loaderData.title} | Swiss Keepsakes`, description: loaderData.description })
    : {},
  pendingComponent: GiftsPending,
  component: GiftsPage,
})

function GiftsPending() {
  const { t } = useLocale()

  return <GiftList banner={{ title: t('gifts.title'), tagline: t('home.victorinox.subtitle'), photo: BANNER_PHOTO }} cards={[]} state="loading" onRetry={() => {}} />
}

function GiftsPage() {
  const { t, intlLocale } = useLocale()
  const { state, first, lang } = Route.useLoaderData()
  const { category } = Route.useSearch()
  const router = useRouter()
  const keepsakes = useInfiniteQuery({
    ...publicKeepsakesQuery(lang, category ?? null),
    staleTime: FRESH_MS,
    enabled: first !== null,
    initialData: first ? { pages: [first], pageParams: [undefined] } : undefined,
  })
  const pages = keepsakes.data?.pages ?? []
  // A keepsake that moved onto a later page while the guest scrolled shows once.
  const items = [...new Map(pages.flatMap(page => page.items).map(item => [item.id, item])).values()]
  // The count and the end line come from the server's total for the filtered set, never from what has loaded.
  const total = pages.at(-1)?.total ?? 0
  const isOne = (count: number) => new Intl.PluralRules(intlLocale).select(count) === 'one'

  return (
    <GiftList
      banner={{
        title: t('gifts.title'),
        tagline: t('home.victorinox.subtitle'),
        countLabel: state === 'ready' && total > 0 ? t(isOne(total) ? 'gifts.count.one' : 'gifts.count.other', { count: total }) : undefined,
        photo: BANNER_PHOTO,
      }}
      cards={items.map(item => toKeepsakeCard(item, t))}
      paging={{
        announce: added => t(isOne(added) ? 'gifts.more.one' : 'gifts.more.other', { count: added }),
        hasMore: keepsakes.hasNextPage,
        isFailed: keepsakes.isFetchNextPageError,
        isLoading: keepsakes.isFetchingNextPage,
        onLoadMore: () => void keepsakes.fetchNextPage(),
      }}
      state={state}
      onRetry={() => void router.invalidate()}
    />
  )
}
