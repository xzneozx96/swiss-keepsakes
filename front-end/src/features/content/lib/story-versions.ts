import type { Article } from '@sk/domain/content'
import type { Language } from '@sk/domain/shared'

import { storyFixtures } from '@/features/content/fixtures/en-only-story'
import { articleSeed } from '@/features/content/seed'
import { loadDemoState } from '@/features/demo/store'

const isProduction = import.meta.env.MODE === 'production'

// On the server there is no browser store, so the loader reads the seed. The fixtures stay out of a production build.
const staticStories: Article[] = isProduction ? articleSeed : [...articleSeed, ...storyFixtures]

/** In the browser the saved demo store holds the stories, so a version the merchant published or made there counts. The fixtures are not in it. */
function browserStories(): Article[] {
  const { articles } = loadDemoState().data

  return isProduction ? articles : [...articles, ...storyFixtures]
}

/** Languages that have a published version of the story, in store order. */
export function storyLanguages(slug: string): Language[] {
  const stories = typeof window === 'undefined' ? staticStories : browserStories()
  const languages = stories
    .filter(story => story.slug === slug && story.publication.status === 'published')
    .map(story => story.language)

  return [...new Set(languages)]
}

/** The published fixture versions of a story, for the article page: the browser store does not hold them. Empty in a production build. */
export function fixtureArticles(slug: string): Article[] {
  return import.meta.env.MODE === 'production'
    ? []
    : storyFixtures.filter(story => story.slug === slug && story.publication.status === 'published')
}
