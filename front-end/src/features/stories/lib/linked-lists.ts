import type { ProductListItem, StoryListItem } from '@sk/api-contract'
import type { LanguageState } from './list'
import type { StoryLanguage } from './search-params'

import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from '@sk/domain/content'

import { thumbOf } from '@/features/media/lib/rules'
import { languageState } from './list'

/** The contract's `idList(50)` for `placeIds`: a 51st id would be a 400. */
export const MAX_PLACES = 50
export const MAX_KEEPSAKES = MAX_ARTICLE_LINKS
export const MAX_RELATED = MAX_RELATED_STORIES

/** Removes `id` when it is chosen; else adds it at the end, unless the list is full (then the same array comes back). */
export function toggleLinked(chosen: string[], id: string, max: number): string[] {
  if (chosen.includes(id))
    return chosen.filter(item => item !== id)

  return chosen.length >= max ? chosen : [...chosen, id]
}

/** A keepsake as a choice. There is no price: the card shows a name and a photo only. */
export interface KeepsakeOption {
  id: string
  name: string
  photo: string | null
  published: boolean
}

export function keepsakeOptionOf(item: ProductListItem, language: StoryLanguage): KeepsakeOption {
  const other = language === 'en' ? 'de' : 'en'

  return {
    id: item.id,
    name: item.name[language] || item.name[other] || '',
    photo: item.cover ? thumbOf(item.cover, 160) : null,
    published: item.status === 'published',
  }
}

/** Only a published keepsake can be linked: a draft and an archived one are left out. */
export const offeredKeepsakes = (all: KeepsakeOption[]) => all.filter(option => option.published)

/** A story as a choice, with the state of each language version. */
export interface StoryOption {
  id: string
  title: string
  photo: string | null
  states: Record<StoryLanguage, LanguageState>
}

export function storyOptionOf(item: StoryListItem, language: StoryLanguage, untitled: string): StoryOption {
  const other = language === 'en' ? 'de' : 'en'

  return {
    id: item.groupId,
    title: item.title[language] || item.title[other] || untitled,
    photo: item.cover ? thumbOf(item.cover, 160) : null,
    states: { en: languageState(item.languages.en), de: languageState(item.languages.de) },
  }
}

/** Every story but the one being edited. */
export const offeredStories = (all: StoryOption[], ownGroupId: string) => all.filter(option => option.id !== ownGroupId)

/** Readers of `language` do not see the story unless its version in that language is published. */
export const hiddenFor = (option: StoryOption, language: StoryLanguage) => option.states[language] !== 'published'
