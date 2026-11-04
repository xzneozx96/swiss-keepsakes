import { createFileRoute, notFound, useNavigate, useRouter } from '@tanstack/react-router'

import { loadBlogCategories, loadPublicStories } from '@/features/content/api/public-stories'
import { StoriesPage } from '@/features/content/components/stories-page'
import { StoriesSkeleton } from '@/features/content/components/stories-skeleton'
import { storiesHead } from '@/features/content/lib/stories-head'
import { openOnboarding } from '@/features/onboarding/lib/opener'
import { isLanguage } from '@/lib/language-routing'

interface StoriesSearch {
  /** A blog category slug. The page applies it only when a story here has that category; the discovery home's old demo values match nothing, so they show every story. */
  category?: string
}

// C19 Stories. The list is read on the server and in the browser for later visits; a failed read is data (`null`), so the page can show its own error with a retry and never a demo story.
export const Route = createFileRoute('/_guest/$lang/stories/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): StoriesSearch =>
    typeof search.category === 'string' && search.category !== '' ? { category: search.category } : {},
  loader: async ({ params }) => {
    if (!isLanguage(params.lang))
      throw notFound()

    // Read together. A failed story read is the page's error; a failed category read only drops the filter row.
    const [stories, categories] = await Promise.all([
      loadPublicStories(params.lang).catch(() => null),
      loadBlogCategories(params.lang).catch(() => null),
    ])

    return { stories, categories }
  },
  head: ({ params }) => (isLanguage(params.lang) ? storiesHead(params.lang) : {}),
  pendingComponent: StoriesSkeleton,
  component: StoriesRoute,
})

function StoriesRoute() {
  const { stories, categories } = Route.useLoaderData()
  const { category } = Route.useSearch()
  const { lang } = Route.useParams()
  const router = useRouter()
  const navigate = useNavigate()

  return (
    <StoriesPage
      categories={categories}
      category={category}
      stories={stories}
      // A choice is a history entry, so Back returns to the previous filter; All drops the parameter.
      onCategoryChange={slug => void navigate({ to: '/$lang/stories', params: { lang }, search: slug ? { category: slug } : {} })}
      onChangeAnswers={() => openOnboarding('change')}
      onRetry={() => void router.invalidate()}
    />
  )
}
