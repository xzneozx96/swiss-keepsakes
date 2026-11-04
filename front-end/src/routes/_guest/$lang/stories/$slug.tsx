import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { StoryPage } from '@/features/content/components/story-page'
import { StorySkeleton } from '@/features/content/components/story-skeleton'
import { readStoryPage } from '@/features/content/lib/read-story'
import { storyHead } from '@/features/content/lib/story-head'
import { useBack } from '@/hooks/use-back'

// C20 Story. The server reads the published story from the API and renders the whole text; a slug with no published version is a 404.
export const Route = createFileRoute('/_guest/$lang/stories/$slug')({
  ssr: true,
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  loader: ({ params }) => readStoryPage(params.lang, params.slug),
  head: ({ loaderData }) => (loaderData ? storyHead(loaderData.story) : {}),
  pendingComponent: StorySkeleton,
  component: StoryRoute,
})

function StoryRoute() {
  const { story } = Route.useLoaderData()
  const { lang } = Route.useParams()
  const navigate = useNavigate()
  const back = useBack(() => void navigate({ to: '/$lang/stories', params: { lang }, replace: true }))

  // Keyed by id so moving between stories starts at the top.
  return <StoryPage key={story.id} story={story} onBack={back} />
}
