import type { StoryVersionText } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Button, Skeleton } from '@heroui/react'
import { useMemo } from 'react'

import { InfoIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { storyBlocks } from '../lib/story-text'
import { StoryBody } from './story-body'

/** The sheet's layout while the text loads: the cover, then the lines of the body. */
function StorySkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4" data-skeleton="story">
      <Skeleton className="aspect-[16/10] w-full shrink-0 rounded-2xl" />
      <Skeleton className="h-6 w-2/3 rounded-lg" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-4/5 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-3/5 rounded-lg" />
      </div>
    </div>
  )
}

function StoryText({ text, language }: { text: StoryVersionText, language: Language }) {
  const { t } = useLocale()
  const blocks = useMemo(() => storyBlocks(text.body, text.media), [text])
  const cover = text.cover?.variants.find(variant => variant.width >= 800) ?? text.cover?.variants.at(-1)
  const coverSrc = cover?.url ?? text.cover?.publicUrl ?? undefined

  return (
    <div className="flex flex-col gap-4" lang={language}>
      {text.status === 'draft' && (
        <p className="flex items-start gap-2 rounded-xl bg-surface-secondary p-3 text-sm" role="status">
          <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t('places.preview.story.draft')}
        </p>
      )}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary">
        {coverSrc && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={coverSrc} />}
      </div>
      <StoryBody blocks={blocks} />
    </div>
  )
}

/**
 * The story of the pin in a bottom sheet inside the place editor's phone, so the merchant reads what "Read the story"
 * opens without leaving the editor (on the real guest map it opens the story page). `text` is the version as the editor
 * last left it, a draft included, in the previewed language: `undefined` while it loads, `error` when the read failed.
 * A 404 means the story has no version in that language.
 */
export function StorySheet({ isOpen, container, title, language, text, loading, error, onClose }: {
  isOpen: boolean
  /** The phone's screen: the sheet slides up inside it and not over the page. */
  container: Element | null
  title: string
  language: Language
  text: StoryVersionText | undefined
  loading: boolean
  error: unknown
  onClose: () => void
}) {
  const { t } = useLocale()
  const none = error instanceof ApiProblem && error.status === 404

  return (
    <SheetFrame
      container={container ?? undefined}
      footer={<Button fullWidth variant="secondary" onPress={onClose}>{t('places.preview.story.close')}</Button>}
      isOpen={isOpen && container !== null}
      title={text?.title || title}
      tightBottom
      onClose={onClose}
    >
      {text
        ? <StoryText language={language} text={text} />
        : loading
          ? <StorySkeleton />
          : <p className="text-muted" lang={language} role={none ? undefined : 'alert'}>{none ? t('places.preview.story.none', { language: t(`places.lang.${language}`) }) : t('places.preview.story.error')}</p>}
    </SheetFrame>
  )
}
