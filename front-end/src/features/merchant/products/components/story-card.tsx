import type { Language } from '@/contexts/locale-context'
import type { LocalizedText } from '@/features/catalog/types'
import type { LocalizedRich, RichNode } from '@/lib/rich-text'

import { Skeleton } from '@heroui/react'
import { lazy, Suspense } from 'react'

import { StoryIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import { isEmptyDoc } from '@/lib/rich-text'
import { LocalizedField } from './editor-parts'

// Tiptap loads only when an editor opens a story.
const StoryEditor = lazy(() => import('./story-editor'))

/**
 * The long story (C03 "About this gift", C09 "About this tour") in one language, inside the
 * stepper's Story step, whose EN | DE switch picks the language: the title and the rich-text
 * editor. A must to publish since 15.10.2026 (owner): a title and a body in at least one
 * language; the other language missing is a warning.
 */
export function StoryCard({
  kind,
  language,
  title,
  body,
  onTitle,
  onBody,
  titleError,
  bodyError,
}: {
  kind: 'gift' | 'tour'
  language: Language
  title: LocalizedText
  body: LocalizedRich
  onTitle: (title: LocalizedText) => void
  /** Per language, so a fast typist's updates never overwrite each other. */
  onBody: (language: Language, doc: RichNode | undefined) => void
  titleError?: string
  bodyError?: string
}) {
  const { t } = useLocale()
  const other: Language = language === 'en' ? 'de' : 'en'
  const has = (lang: Language) => !!body[lang] && !isEmptyDoc(body[lang])

  return (
    <DetailCard
      icon={StoryIcon}
      id="long-story"
      title={t('products.story.title')}
    >
      <p className="text-sm text-pretty text-muted">
        {t(`products.story.help.${kind}`)}
      </p>
      <LocalizedField
        error={titleError}
        label={t('products.story.storyTitle')}
        language={language}
        value={title}
        onChange={onTitle}
      />
      <Suspense fallback={<Skeleton className="h-60 w-full rounded-2xl" />}>
        <StoryEditor
          key={language}
          label={t('products.story.body')}
          value={body[language]}
          onChange={doc => onBody(language, doc)}
        />
      </Suspense>
      {bodyError && (
        <p data-visible className="field-error" role="alert">
          {bodyError}
        </p>
      )}
      {!has(language) && has(other) && (
        <p className="text-xs text-pretty text-muted">
          {t('products.story.fallback', {
            language: t(`products.lang.${language}`),
            other: t(`products.lang.${other}`),
          })}
        </p>
      )}
    </DetailCard>
  )
}
