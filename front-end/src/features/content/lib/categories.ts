import type { StoryCategory } from '../types'

import { STORY_CATEGORIES } from '../types'

/** Thumbnail per category, shared by the C01 links and the C19 filter (photo slugs). */
export const storyCategoryPhoto: Record<StoryCategory, string> = {
  eat: 'rigi-kulm-restaurant',
  town: 'lucerne-old-town',
  lake: 'lake-steamboat',
  craft: 'victorinox-spartan',
}

export const ALL_STORIES_PHOTO = 'lucerne-kapellbruecke-1200'

export function isStoryCategory(value: unknown): value is StoryCategory {
  return STORY_CATEGORIES.includes(value as StoryCategory)
}
