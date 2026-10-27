import type { StoryCategory } from '@sk/domain/content'

import { createFileRoute } from '@tanstack/react-router'

import { StoriesPage } from '@/features/content/components/stories-page'
import { isStoryCategory } from '@/features/content/lib/categories'

interface StoriesSearch {
  /** From a category on the discovery home or the filter row; absent = all stories. */
  category?: StoryCategory
}

// C19 Stories.
export const Route = createFileRoute('/_guest/stories/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): StoriesSearch =>
    isStoryCategory(search.category) ? { category: search.category } : {},
  component: StoriesRoute,
})

function StoriesRoute() {
  const { category } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <StoriesPage
      category={category}
      onCategoryChange={next =>
        void navigate({
          search: next ? { category: next } : {},
          replace: true,
        })}
    />
  )
}
