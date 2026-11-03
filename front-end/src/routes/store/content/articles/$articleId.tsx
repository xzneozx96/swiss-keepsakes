import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { StoryEditorScreen } from '@/features/stories/components/story-editor-screen'
import { storySearch } from '@/features/stories/lib/search-params'

// The story editor (E4.3). `$articleId` is the story group's id; `?lang=en|de` is the open language version and
// `?screen=review` the Review and publish screen (none means Write).
export const Route = createFileRoute('/store/content/articles/$articleId')({
  validateSearch: storySearch,
  component: StoryEditorPage,
})

function StoryEditorPage() {
  const { articleId } = Route.useParams()
  const { lang, screen } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <StoryEditorScreen
      groupId={articleId}
      language={lang}
      screen={screen ?? 'write'}
      onLanguage={next => void navigate({ search: previous => ({ ...previous, lang: next }), replace: true })}
      onScreen={next => void navigate({ search: previous => ({ ...previous, screen: next === 'review' ? 'review' : undefined }) })}
    />
  )
}
