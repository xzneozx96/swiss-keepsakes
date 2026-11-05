import type { PublicStoryCard } from '@sk/api-contract'

import { buttonVariants, Skeleton } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { useLocale } from '@/contexts/locale-context'
import { StoryCard } from '@/features/content/components/story-card'
import { coverSrc } from '@/features/content/lib/cover-src'
import { HOME_STORY_COUNT, newestStories } from '../lib/newest-stories'
import { SectionHeading } from './section-heading'

/** The compact rows: a 96 px square photo, then the title, two lines of excerpt and the meta line. */
function StoriesSkeleton() {
  return (
    <ul aria-busy aria-hidden className="flex flex-col gap-4" data-skeleton="stories">
      {Array.from({ length: HOME_STORY_COUNT }, (_, index) => (
        <li key={index} className="flex items-center gap-3">
          <Skeleton className="size-24 shrink-0 rounded-2xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-5 w-4/5 rounded-lg" />
            <Skeleton className="h-3.5 w-full rounded-lg" />
            <Skeleton className="h-3.5 w-3/5 rounded-lg" />
            <Skeleton className="h-3 w-1/3 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * "Stories from Lucerne": the three newest published stories as compact rows (a small photo beside the text), then a button to the whole list.
 * No filter and no sorting for the guest's answers. `stories` is undefined while the read loads and null when it failed.
 * With no story the section is not drawn.
 */
export function StoriesSection({ stories, onRetry }: { stories: readonly PublicStoryCard[] | null | undefined, onRetry: () => void }) {
  const { t, language } = useLocale()
  const headingId = useId()

  if (stories && stories.length === 0)
    return null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <SectionHeading body={t('homePage.stories.body')} id={headingId} title={t('homePage.stories.title')} />
      {stories === null
        ? <ErrorNotice compact message={t('homePage.stories.failed')} onRetry={onRetry} />
        : stories === undefined
          ? <StoriesSkeleton />
          : (
              <>
                <ul className="flex flex-col gap-4">
                  {newestStories(stories).map(story => (
                    <li key={story.id}>
                      <StoryCard
                        excerpt={story.excerpt}
                        lang={story.language}
                        layout="row"
                        meta={t('home.stories.read', { minutes: story.readMinutes })}
                        photo={coverSrc(story.cover)}
                        slug={story.slug}
                        tag={story.fallback ? { code: story.language.toUpperCase(), label: t(`stories.language.${story.language}`) } : undefined}
                        title={story.title}
                      />
                    </li>
                  ))}
                </ul>
                <Link
                  className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform active:scale-[0.98]`}
                  params={{ lang: language }}
                  to="/$lang/stories"
                >
                  {t('homePage.stories.seeAll')}
                </Link>
              </>
            )}
    </section>
  )
}
