import {
  createFileRoute,
  notFound,
  redirect,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect } from 'react'

import { ArticleSkeleton } from '@/components/layout/guest-skeletons'
import { ArticlePage } from '@/features/content/components/article-page'
import { storyLanguages } from '@/features/content/lib/story-versions'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { isLanguage, pageVersionRule } from '@/lib/language-routing'

// C20 Article.
export const Route = createFileRoute('/_guest/$lang/stories/$slug')({
  ssr: true,
  // The comment bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  // A story may exist in one language only. The address in the other language goes to the one that exists. The server reads the seed, the browser reads the saved demo store. A slug with no published version is a 404 on the server only: in the browser it shows the page's own not-found state.
  loader: ({ params, location }) => {
    const { lang, slug } = params
    if (!isLanguage(lang))
      throw notFound()

    const availableLanguages = storyLanguages(slug)
    const rule = pageVersionRule(availableLanguages, lang)

    if (rule.kind === 'redirect')
      throw redirect({ to: '/$lang/stories/$slug', params: { lang: rule.language, slug }, search: location.search, hash: location.hash, statusCode: 302 })
    if (rule.kind === 'missing' && typeof window === 'undefined')
      throw notFound()

    return { availableLanguages }
  },
  component: ArticleRoute,
})

function ArticleRoute() {
  const { lang: language, slug } = Route.useParams()
  const { availableLanguages } = Route.useLoaderData()
  const isLoading = useSimulatedLoading()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  // A hard load is server-rendered from the seed, and the browser copies the server's loader data without running the loader. If the saved store knows other languages for this story, run the loader again here: its redirect (ADR-002 step 6) and the notice's data then follow the store. Once the data matches the store this does nothing, so it cannot loop.
  useEffect(() => {
    const known = storyLanguages(slug)

    if (known.length !== availableLanguages.length || known.some(l => !availableLanguages.includes(l)))
      void router.invalidate()
  }, [slug, availableLanguages, router])

  if (isLoading)
    return <ArticleSkeleton />

  // Keyed by slug so moving between stories starts at the top with a closed sheet.
  return (
    <ArticlePage
      key={slug}
      slug={slug}
      onBack={() =>
        canGoBack ? router.history.back() : void navigate({ to: '/$lang/stories', params: { lang: language } })}
    />
  )
}
