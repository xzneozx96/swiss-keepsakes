import type { LocalizedText } from '@sk/domain/catalog'
import type { LocalizedRich, RichNode } from '@sk/domain/shared'
import type { Language } from '@/contexts/locale-context'

import { Skeleton } from '@heroui/react'
import { isEmptyDoc } from '@sk/domain/shared'

import { lazy, Suspense } from 'react'

import { StoryIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
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
      <Suspense fallback={<StoryEditorSkeleton />}>
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

/** The rich-text editor while its code loads: a toolbar of small buttons over a few lines of text. */
function StoryEditorSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-surface">
      <div className="flex gap-2">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="size-8 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-4 w-full rounded-lg" />
      <Skeleton className="h-4 w-5/6 rounded-lg" />
      <Skeleton className="h-4 w-2/3 rounded-lg" />
    </div>
  )
}
