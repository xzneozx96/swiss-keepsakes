import type { StoryCategory } from '@sk/domain/content'

import { createFileRoute, notFound, useRouter } from '@tanstack/react-router'

import { loadPublicStories } from '@/features/content/api/public-stories'
import { StoriesPage } from '@/features/content/components/stories-page'
import { StoriesSkeleton } from '@/features/content/components/stories-skeleton'
import { isStoryCategory } from '@/features/content/lib/categories'
import { storiesHead } from '@/features/content/lib/stories-head'
import { isLanguage } from '@/lib/language-routing'

interface StoriesSearch {
  /** The discovery home still links here with a demo category. The list has no category filter (the API's categories are the stores' own), so it is read and ignored. */
  category?: StoryCategory
}

// C19 Stories. The list is read on the server and in the browser for later visits; a failed read is data (`null`), so the page can show its own error with a retry and never a demo story.
export const Route = createFileRoute('/_guest/$lang/stories/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): StoriesSearch =>
    isStoryCategory(search.category) ? { category: search.category } : {},
  loader: async ({ params }) => {
    if (!isLanguage(params.lang))
      throw notFound()

    return { stories: await loadPublicStories(params.lang).catch(() => null) }
  },
  head: ({ params }) => (isLanguage(params.lang) ? storiesHead(params.lang) : {}),
  pendingComponent: StoriesSkeleton,
  component: StoriesRoute,
})

function StoriesRoute() {
  const { stories } = Route.useLoaderData()
  const router = useRouter()

  return <StoriesPage stories={stories} onRetry={() => void router.invalidate()} />
}
