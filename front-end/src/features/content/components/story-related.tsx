import type { PublicStory } from '@sk/api-contract'

import { useLocale } from '@/contexts/locale-context'
import { coverSrc } from '../lib/cover-src'
import { StoryCard } from './story-card'

const MAX_STORIES = 3

/** Up to three related stories as cards, each linking to its own language's address. Nothing to show draws nothing. */
export function StoryRelated({ stories }: { stories: PublicStory['related'] }) {
  const { t } = useLocale()

  if (stories.length === 0)
    return null

  return (
    <section aria-labelledby="story-related" className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
      <h2 className="font-serif text-title" id="story-related">{t('article.more')}</h2>
      <ul className="flex flex-col gap-7">
        {stories.slice(0, MAX_STORIES).map(story => (
          <li key={story.id}>
            <StoryCard
              excerpt={story.excerpt}
              lang={story.language}
              meta={t('home.stories.read', { minutes: story.readMinutes })}
              photo={coverSrc(story.cover)}
              slug={story.slug}
              tag={story.fallback ? { code: story.language.toUpperCase(), label: t(`stories.language.${story.language}`) } : undefined}
              title={story.title}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
