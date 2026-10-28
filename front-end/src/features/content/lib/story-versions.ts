import type { Article } from '@sk/domain/content'
import type { Language } from '@sk/domain/shared'

import { storyFixtures } from '@/features/content/fixtures/en-only-story'
import { articleSeed } from '@/features/content/seed'

// The loader runs before the browser-held store exists, so it reads static data. The fixtures stay out of a production build.
const staticStories: Article[] = import.meta.env.MODE === 'production' ? articleSeed : [...articleSeed, ...storyFixtures]

/** Languages that have a published version of the story, in seed order. */
export function storyLanguages(slug: string): Language[] {
  const languages = staticStories
    .filter(story => story.slug === slug && story.publication.status === 'published')
    .map(story => story.language)
  return [...new Set(languages)]
}
