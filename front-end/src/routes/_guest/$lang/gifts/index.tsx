import { createFileRoute, useRouter } from '@tanstack/react-router'
import { loadDictionary, useLocale } from '@/contexts/locale-context'
import { fetchKeepsakeList } from '@/features/catalog/api/keepsakes'
import { GiftList } from '@/features/catalog/components/gift-list'
import { toKeepsakeCard } from '@/features/catalog/lib/keepsake-card'
import { alternateHead } from '@/features/seo/lib/page-head'
import { isLanguage } from '@/lib/language-routing'

interface GiftsSearch {
  subcategory?: string
  q?: string
}

const BANNER_PHOTO = 'lucerne-kapellbruecke-1200'

// C02 Keepsakes: the published list, server-rendered, no price (AC54). The sub-category and search params of the
// demo list are still accepted so that an old link opens the list; the list ignores them (search is T-E4.14b).
export const Route = createFileRoute('/_guest/$lang/gifts/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): GiftsSearch => ({
    ...(typeof search.subcategory === 'string' && search.subcategory && { subcategory: search.subcategory }),
    ...(typeof search.q === 'string' && search.q.trim() && { q: search.q }),
  }),
  loader: async ({ params }) => {
    const lang = isLanguage(params.lang) ? params.lang : 'en'
    const dictionary = await loadDictionary(lang)
    const text = { title: dictionary['gifts.title'], description: dictionary['gifts.tagline'] }

    try {
      return { ...text, lang, state: 'ready' as const, items: (await fetchKeepsakeList(lang)).items }
    }
    // The page renders its own error state with a retry; the read is not repeated here.
    catch {
      return { ...text, lang, state: 'failed' as const, items: [] }
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

  return <GiftList banner={{ title: t('gifts.title'), tagline: t('gifts.tagline'), photo: BANNER_PHOTO }} cards={[]} state="loading" onRetry={() => {}} />
}

function GiftsPage() {
  const { t, intlLocale } = useLocale()
  const { state, items } = Route.useLoaderData()
  const router = useRouter()
  const one = new Intl.PluralRules(intlLocale).select(items.length) === 'one'

  return (
    <GiftList
      banner={{
        title: t('gifts.title'),
        tagline: t('gifts.tagline'),
        countLabel: state === 'ready' && items.length > 0 ? t(one ? 'gifts.count.one' : 'gifts.count.other', { count: items.length }) : undefined,
        photo: BANNER_PHOTO,
      }}
      cards={items.map(item => toKeepsakeCard(item, t))}
      state={state}
      onRetry={() => void router.invalidate()}
    />
  )
}
