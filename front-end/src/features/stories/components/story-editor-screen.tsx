import type { StoryLanguage } from '../lib/search-params'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { ErrorNotice } from '@/components/error-notice'
import { StoryIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { sessionUserQuery } from '@/features/stores/api/queries'
import { useStoryGroup } from '../api/queries'
import { accountNameOf } from '../lib/draft'
import { STORIES_PATH } from '../lib/search-params'
import { StoriesGate } from './stories-gate'
import { StoryEditorSkeleton } from './story-editor-skeleton'
import { StoryVersionEditor } from './story-version-editor'

function LoadedEditor({ storeId, groupId, language, screen, onLanguage, onScreen }: {
  storeId: string
  groupId: string
  language: StoryLanguage | undefined
  screen: 'write' | 'review'
  onLanguage: (language: StoryLanguage) => void
  onScreen: (screen: 'write' | 'review') => void
}) {
  const { t } = useLocale()
  const query = useStoryGroup(storeId, groupId)
  const session = useQuery(sessionUserQuery)
  // A reload starts the typed fields over from the server's copy: a new generation is a new editor.
  const [generation, setGeneration] = useState(0)
  const group = query.data
  const notFound = <EmptyState action={{ label: t('storyEditor.back.toStories'), to: STORIES_PATH }} icon={StoryIcon} message={t('storyEditor.notFound')} />

  if (query.isError && !group) {
    if (query.error instanceof ApiProblem && (query.error.type === 'not-found' || query.error.status === 404))
      return notFound

    return <ErrorNotice message={t('storyEditor.problem.generic')} reference={query.error instanceof ApiProblem ? query.error.requestId : undefined} onRetry={() => void query.refetch()} />
  }
  if (!group)
    return <StoryEditorSkeleton />
  // The open version is the one asked for, else English, else German. A group with neither has nothing to edit.
  const open = language && group.versions[language] ? language : group.versions.en ? 'en' : group.versions.de ? 'de' : undefined

  if (!open)
    return notFound

  return (
    <StoryVersionEditor
      key={`${group.id}:${open}:${generation}`}
      accountName={accountNameOf(session.data)}
      group={group}
      language={open}
      screen={screen}
      storeId={storeId}
      onLanguage={onLanguage}
      onReload={() => void query.refetch().then(() => setGeneration(current => current + 1))}
      onScreen={onScreen}
    />
  )
}

/** The story editor at `/store/content/articles/$articleId`: one story group, one language version open at a time. */
export function StoryEditorScreen({ groupId, language, screen, onLanguage, onScreen }: {
  groupId: string
  /** From `?lang`; falls back to the first version that exists. */
  language: StoryLanguage | undefined
  screen: 'write' | 'review'
  onLanguage: (language: StoryLanguage) => void
  onScreen: (screen: 'write' | 'review') => void
}) {
  return (
    <StoriesGate fallback={<StoryEditorSkeleton />}>
      {storeId => <LoadedEditor groupId={groupId} language={language} screen={screen} storeId={storeId} onLanguage={onLanguage} onScreen={onScreen} />}
    </StoriesGate>
  )
}
