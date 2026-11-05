import type { PublicStoryCard } from '@sk/api-contract'

export const HOME_STORY_COUNT = 3

/** The newest published stories, newest first, at most three. The API already sends them newest first; sorting here keeps the home right if that order changes. */
export function newestStories(stories: readonly PublicStoryCard[]): PublicStoryCard[] {
  return [...stories].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, HOME_STORY_COUNT)
}
