import type { StoryListItem, StoryListVersion } from '@sk/api-contract'

export const STORY_TABS = ['all', 'published', 'drafts'] as const

export type StoryTab = (typeof STORY_TABS)[number]

export type LanguageState = 'published' | 'draft' | 'none'

/** No version in the language is `none`; a version with a published text live is `published`; any other is a `draft`. */
export function languageState(version: StoryListVersion | null): LanguageState {
  if (!version)
    return 'none'

  return version.status === 'published' ? 'published' : 'draft'
}

const titleOf = (title: string | undefined) => title?.trim() ?? ''

/** The first language version that has a title: English, then German. Empty when neither has one. */
export function storyTitle(item: StoryListItem): string {
  return titleOf(item.title.en) || titleOf(item.title.de)
}

/** A story is published when any language version is live. One that was published and then taken down is a draft. */
export function isPublishedStory(item: StoryListItem): boolean {
  return languageState(item.languages.en) === 'published' || languageState(item.languages.de) === 'published'
}
