import { createFileRoute, notFound, useNavigate, useRouter } from '@tanstack/react-router'

import { loadBlogCategories, loadPublicStoriesPage, STORIES_PAGE_SIZE } from '@/features/content/api/public-stories'
import { StoriesPage } from '@/features/content/components/stories-page'
import { StoriesSkeleton } from '@/features/content/components/stories-skeleton'
import { offeredCategories, resolveCategory } from '@/features/content/lib/category-filter'
import { storiesHead } from '@/features/content/lib/stories-head'
import { isLanguage } from '@/lib/language-routing'

interface StoriesSearch {
  /** A blog category slug. The page applies it only when it is one of the offered categories; the discovery home's old demo values match nothing, so they show every story. */
  category?: string
}

// C19 Stories. The first page (10) for the chosen category is read on the server, so the HTML carries it (ADR-033); the page loads the
// rest in the browser as the guest scrolls. A failed read is data (`null`), so the page can show its own error with a retry and never a demo story.
export const Route = createFileRoute('/_guest/$lang/stories/')({
  ssr: true,
  validateSearch: (search: Record<string, unknown>): StoriesSearch =>
    typeof search.category === 'string' && search.category !== '' ? { category: search.category } : {},
  // The category is a server filter now, so a new one reads its own first page.
  loaderDeps: ({ search }) => ({ category: search.category }),
  loader: async ({ params, deps }) => {
    if (!isLanguage(params.lang))
      throw notFound()

    // Read together. A failed story read is the page's error; a failed category read only drops the filter row.
    const { lang } = params
    const readFirst = (category: string | undefined) => loadPublicStoriesPage(lang, { category, limit: STORIES_PAGE_SIZE }).catch(() => null)
    const [first, categories] = await Promise.all([
      readFirst(deps.category),
      loadBlogCategories(lang).catch(() => null),
    ])
    // A slug that is not an offered category (an old demo link, or no category list) shows every story, as before.
    const category = resolveCategory(categories ? offeredCategories(categories, lang) : [], deps.category)

    return { lang, first: category === (deps.category ?? null) ? first : await readFirst(undefined), categories, category }
  },
  head: ({ params }) => (isLanguage(params.lang) ? storiesHead(params.lang) : {}),
  pendingComponent: StoriesSkeleton,
  component: StoriesRoute,
})

function StoriesRoute() {
  const { lang, first, categories, category } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  return (
    <StoriesPage
      categories={categories}
      category={category}
      first={first}
      lang={lang}
      // A choice is a history entry, so Back returns to the previous filter; All drops the parameter.
      onCategoryChange={slug => void navigate({ to: '/$lang/stories', params: { lang }, search: slug ? { category: slug } : {} })}
      onRetry={() => void router.invalidate()}
    />
  )
}
