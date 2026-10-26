import { Skeleton } from '@heroui/react'
import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { ArticlePage } from '@/features/content/components/article-page'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// C20 Article.
export const Route = createFileRoute('/_guest/stories/$slug')({
  ssr: true,
  // The comment bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: ArticleRoute,
})

function ArticleRoute() {
  const { slug } = Route.useParams()
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
        canGoBack ? router.history.back() : void navigate({ to: '/stories' })}
    />
  )
}
