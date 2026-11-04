import type { PublicKeepsake, PublicLanguage } from '@sk/api-contract'
import { descriptionText } from '@sk/domain/content'
import {
  createFileRoute,
  notFound,
  redirect,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { GiftDetailSkeleton } from '@/components/layout/guest-skeletons'
import { useLocale } from '@/contexts/locale-context'
import { fetchKeepsake } from '@/features/catalog/api/keepsake'
import { GiftDetail } from '@/features/catalog/components/gift-detail'
import { useKeepsakeDetail } from '@/features/catalog/hooks/use-keepsake-detail'
import { richNodeOf } from '@/features/catalog/lib/keepsake-page'
import { alternateHead } from '@/features/seo/lib/page-head'
import { isLanguage } from '@/lib/language-routing'

const BLANKS = /\s+/g

// C03 Keepsake: the text, photos and options are read from the public API on the server; the price and the units are
// read in the browser (AC54). An unknown or unpublished slug is a 404 (AC61).
export const Route = createFileRoute('/_guest/$lang/gifts/$slug')({
  ssr: true,
  // The bottom bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  // The address carries the slug of its own language. Any other address (the slug of the other language, or a language the keepsake has no version in) goes to the version that exists.
  loader: async ({ params, location }) => {
    if (!isLanguage(params.lang))
      throw notFound()
    const keepsake = await fetchKeepsake(params.slug, params.lang)

    if (!keepsake)
      throw notFound()

    if (keepsake.language !== params.lang || keepsake.slug !== params.slug)
      throw redirect({ to: '/$lang/gifts/$slug', params: { lang: keepsake.language, slug: keepsake.slug }, search: location.search, hash: location.hash, statusCode: 302 })

    return { keepsake, lang: params.lang }
  },
  head: ({ loaderData }) => {
    if (!loaderData)
      return {}
    const { keepsake } = loaderData
    const other = keepsake.language === 'en' ? 'de' : 'en'
    const slugs = { [keepsake.language]: keepsake.slug, ...(keepsake.otherSlug && { [other]: keepsake.otherSlug }) }
    const text = descriptionText(richNodeOf(keepsake.description)).replace(BLANKS, ' ').trim()
    const image = keepsake.cover?.url

    return alternateHead({
      lang: keepsake.language,
      languages: Object.keys(slugs) as PublicLanguage[],
      path: l => `/${l}/gifts/${slugs[l]}`,
      title: `${keepsake.name} | Swiss Keepsakes`,
      description: text,
      // The snippet names the product and never an offer: a price is read in the browser only (AC54).
      jsonLd: { '@context': 'https://schema.org', '@type': 'Product', 'name': keepsake.name, 'description': text, ...(image && { image }) },
    })
  },
  pendingComponent: GiftDetailSkeleton,
  component: GiftDetailPage,
})

function GiftDetailPage() {
  const { keepsake, lang } = Route.useLoaderData()

  // Keyed by id so moving between keepsakes starts with an empty form.
  return <GiftDetailScreen key={keepsake.id} keepsake={keepsake} lang={lang} />
}

function GiftDetailScreen({ keepsake, lang }: { keepsake: PublicKeepsake, lang: PublicLanguage }) {
  const { language } = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const view = useKeepsakeDetail(keepsake, lang)

  return (
    <GiftDetail
      {...view}
      onBack={() =>
        canGoBack ? router.history.back() : void navigate({ to: '/$lang/gifts', params: { lang: language } })}
    />
  )
}
