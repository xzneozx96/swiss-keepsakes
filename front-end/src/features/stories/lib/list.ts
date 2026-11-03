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

function matches(item: StoryListItem, query: string) {
  return query === '' || [item.title.en, item.title.de].some(title => title?.toLowerCase().includes(query))
}

function inTab(item: StoryListItem, tab: StoryTab) {
  return tab === 'all' || isPublishedStory(item) === (tab === 'published')
}

/** The tab's stories whose title, in either language, holds the search (trimmed, any case). */
export function filterStories(items: StoryListItem[], tab: StoryTab, query: string): StoryListItem[] {
  const needle = query.trim().toLowerCase()

  return items.filter(item => inTab(item, tab) && matches(item, needle))
}

/** The count on each tab follows the search, not the tab. */
export function tabCounts(items: StoryListItem[], query: string): Record<StoryTab, number> {
  return { all: filterStories(items, 'all', query).length, published: filterStories(items, 'published', query).length, drafts: filterStories(items, 'drafts', query).length }
}
