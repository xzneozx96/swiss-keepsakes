/** The Stories list, the merchant's Content landing page. */
export const STORIES_PATH = '/store/content' as const

/** The story editor route (T-E4.3b). `$articleId` is the story group's id. */
export const STORY_PATH = '/store/content/articles/$articleId' as const

export const STORY_LANGUAGES = ['en', 'de'] as const
export type StoryLanguage = (typeof STORY_LANGUAGES)[number]

/** What the editor reads from the address: the open language and Review. Write is the absence of `screen`. */
export interface StorySearch { lang?: StoryLanguage, screen?: 'review' }

/** Anything else than `en`, `de` and `review` is dropped, so a hand-typed address opens the Write screen. */
export function storySearch(search: Record<string, unknown>): StorySearch {
  return {
    lang: search.lang === 'en' || search.lang === 'de' ? search.lang : undefined,
    screen: search.screen === 'review' ? 'review' : undefined,
  }
}
