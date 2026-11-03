import type { StoryDraft } from '@sk/api-contract'
import type { StoryBody } from '@sk/domain/content'
import type { BodyHandover } from '../hooks/use-story-version-editor'
import type { StoryLanguage } from '../lib/search-params'

import { storyBodyFacts } from '@sk/domain/content'
import { lazy, Suspense } from 'react'

import { EditIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { usePinOptions } from '../hooks/use-pin-options'
import { bodyFactsLine } from '../lib/facts-line'
import { StoryBodySkeleton } from './story-body-skeleton'
import { WriteCard } from './story-write-card'

// Tiptap and ProseMirror load here, never from a route or a shared module (performance rule 9; the guard test checks it).
const StoryBodyEditor = lazy(() => import('../editor/story-body-editor'))

/**
 * Card two of Write: the body, one Tiptap editor per language version, and the facts line under it. The editor is
 * uncontrolled (it starts from `body`), so `body` here is what the card last received from it, 300 ms behind typing; the
 * facts line reads it.
 */
export function StoryBodyCard({ storeId, language, body, onChange, onDirty, registerHandover }: {
  storeId: string
  language: StoryLanguage
  body: StoryDraft['body']
  onChange: (patch: { body: StoryDraft['body'] }) => void
  onDirty: () => void
  registerHandover: (handover: BodyHandover | null) => void
}) {
  const { t, intlLocale } = useLocale()
  const { pins } = usePinOptions(storeId, language)

  return (
    <WriteCard icon={EditIcon} title={t('storyEditor.card.story')}>
      <Suspense fallback={<StoryBodySkeleton />}>
        <StoryBodyEditor body={body} language={language} pins={pins} storeId={storeId} registerHandover={registerHandover} onChange={next => onChange({ body: next })} onDirty={onDirty} />
      </Suspense>
      <p className="text-xs text-muted tabular-nums">{bodyFactsLine(t, intlLocale, storyBodyFacts(body as StoryBody))}</p>
    </WriteCard>
  )
}
