import type { StoryVersionText } from '@sk/api-contract'
import type { StoryBody } from '@sk/domain/content'
import type { Language } from '@sk/domain/shared'
import type { PreviewKeepsake, PreviewPin, PreviewStory } from '../lib/preview-rules'

import { storyBodyFacts } from '@sk/domain/content'
import { formatShortDate } from '@sk/domain/shared'
import { useMemo, useRef } from 'react'

import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { ArticleContents } from '@/features/content/components/article-contents'
import { storyBlocks } from '@/features/places/lib/story-text'
import { avatarUrl } from '@/lib/avatars'
import { contentsOf, headingsOf } from '../lib/preview-rules'
import { StoryPreviewBody } from './story-preview-body'

export interface StoryPreviewPageProps {
  language: Language
  title: string
  excerpt: string
  cover: string | undefined
  author: string
  /** `YYYY-MM-DD`. */
  publishedOn: string
  /** `YYYY-MM-DD`, passed in so the page stays pure. */
  today: string
  review: { checkedOn: string } | null
  body: StoryVersionText['body']
  media: StoryVersionText['media']
  pinHref: (pinId: string) => string | null
  places: PreviewPin[]
  keepsakes: PreviewKeepsake[]
  related: PreviewStory[]
}

/**
 * The guest story page (C20) drawn from a draft held in memory: cover, byline, contents bar, body, places, keepsakes and
 * more to discover. It reads the labels from the locale around it, so the caller wraps it in `LocaleOverride`.
 */
export function StoryPreviewPage({ language, title, excerpt, cover, author, publishedOn, today, review, body, media, pinHref, places, keepsakes, related }: StoryPreviewPageProps) {
  const { t, intlLocale } = useLocale()
  const bodyRef = useRef<HTMLDivElement>(null)
  const blocks = useMemo(() => storyBlocks(body, media, { pinHref }), [body, media, pinHref])
  const headings = useMemo(() => headingsOf(blocks), [blocks])
  const sections = contentsOf(headings).map(chip => ({ ...chip, blocks: [] }))
  const minutes = useMemo(() => storyBodyFacts(body as StoryBody).minutes, [body])

  return (
    <article className="flex flex-col bg-background text-foreground" lang={language}>
      <Media alt="" className="h-[440px]" photo={cover}>
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/75" />
        <header className="absolute inset-x-6 bottom-12 flex flex-col gap-2 text-white">
          <h1 className="font-serif text-display text-balance">{title || t('merchantStories.untitled')}</h1>
          {excerpt && <p className="text-body text-white/85">{excerpt}</p>}
        </header>
      </Media>
      <div className="relative -mt-6 flex flex-col rounded-t-3xl bg-background px-6 pt-7 pb-8">
        {author && (
          <div className="flex items-center gap-3">
            <img alt="" className="size-12 shrink-0 rounded-full bg-surface-secondary object-cover" decoding="async" src={avatarUrl(author)} />
            <span className="min-w-0 font-semibold">{author}</span>
          </div>
        )}
        <p className="mt-3 text-sm text-muted tabular-nums">
          {t('article.meta', { date: formatShortDate(publishedOn, today, intlLocale), minutes })}
          {review && ` · ${t('storyPreview.checked', { date: formatShortDate(review.checkedOn, today, intlLocale) })}`}
        </p>

        <div className="mt-6 flex flex-col">
          {sections.length > 0 && <ArticleContents bodyRef={bodyRef} label={t('article.contents')} sections={sections} />}
          <div ref={bodyRef} className="flex flex-col gap-4 pt-6">
            <StoryPreviewBody blocks={blocks} headings={headings} />
          </div>
        </div>

        {places.length > 0 && (
          <ul aria-label={t('storyPreview.places')} className="mt-8 flex flex-wrap gap-2">
            {places.map(place => <li key={place.id} className="rounded-full bg-surface-secondary px-3 py-1.5 text-sm">{place.name}</li>)}
          </ul>
        )}

        {keepsakes.length > 0 && (
          <section className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
            <h2 className="font-serif text-title">{t('storyPreview.keepsakes')}</h2>
            <ul className="flex gap-3 overflow-x-auto">
              {keepsakes.map(keepsake => (
                <li key={keepsake.id} className="flex w-36 shrink-0 flex-col gap-2">
                  <Media alt="" className="aspect-square rounded-2xl" photo={keepsake.photo} />
                  <span className="line-clamp-2 font-serif text-sm">{keepsake.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
            <h2 className="font-serif text-title">{t('article.more')}</h2>
            <ul className="flex flex-col gap-3">
              {related.map(story => (
                <li key={story.groupId} className="flex items-center gap-3">
                  <Media alt="" className="size-16 shrink-0 rounded-2xl" photo={story.photo} />
                  <span className="font-serif text-card-title">{story.title}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  )
}
