import type { StoryLabSearch } from '@/features/lab/story-editor-search-params'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { StoryEditorLabApp } from '@/features/lab/story-editor-app'
import { StoryEditorLab } from '@/features/lab/story-editor-lab'
import { parseStoryLabSearch } from '@/features/lab/story-editor-search-params'
import { noIndexHead } from '@/lib/no-index'

/** Lab, slice S3: the merchant story editor (M17, E4.3) in a frame at laptop or phone width. */
export const Route = createFileRoute('/lab/story-editor')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): StoryLabSearch => parseStoryLabSearch(search),
  component: StoryEditorLabRoute,
})

function StoryEditorLabRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/lab/story-editor' })

  // Inside the frame: only the editor.
  if (search.embed === 1)
    return <StoryEditorLabApp state={search.state} />

  return <StoryEditorLab search={search} onChange={patch => void navigate({ search: prev => ({ ...prev, ...patch }), replace: true })} />
}
