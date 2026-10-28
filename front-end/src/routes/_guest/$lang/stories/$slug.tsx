import { Skeleton } from '@heroui/react'
import {
  createFileRoute,
  notFound,
  redirect,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { ArticlePage } from '@/features/content/components/article-page'
import { storyLanguages } from '@/features/content/lib/story-versions'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { isLanguage, pageVersionRule } from '@/lib/language-routing'

// C20 Article.
export const Route = createFileRoute('/_guest/$lang/stories/$slug')({
  ssr: true,
  // The comment bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  // A story may exist in one language only. The address in the other language goes to the one that exists. A slug the static data does not know is a 404 on the server only: in the browser the store may hold a merchant-made story.
  loader: ({ params }) => {
    const { lang, slug } = params
    if (!isLanguage(lang))
      throw notFound()

    const availableLanguages = storyLanguages(slug)
    const rule = pageVersionRule(availableLanguages, lang)

    if (rule.kind === 'redirect')
      throw redirect({ to: '/$lang/stories/$slug', params: { lang: rule.language, slug }, statusCode: 302 })
    if (rule.kind === 'missing' && typeof window === 'undefined')
      throw notFound()

    return { availableLanguages }
  },
  component: ArticleRoute,
})

function ArticleRoute() {
  const { lang: language, slug } = Route.useParams()
  const isLoading = useSimulatedLoading()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-[min(68dvh,540px)] w-full" />
        <div className="flex flex-col gap-3 px-6">
          <Skeleton className="h-12 w-2/3 rounded-full" />
          <Skeleton className="h-5 w-full rounded-lg" />
          <Skeleton className="h-5 w-4/5 rounded-lg" />
        </div>
      </div>
    )
  }

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
