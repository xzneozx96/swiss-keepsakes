import type { StoryBodyFacts } from '@sk/domain/content'

import type { MessageKey } from '@/i18n/en'

import { pluralCategory } from '@sk/domain/shared'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/** The line under the body: "{n} words · {m} min read · Contents: {k} sections". The contents list needs 2 or more H2. */
export function bodyFactsLine(t: Translate, intlLocale: string, facts: StoryBodyFacts): string {
  const words = t(pluralCategory(intlLocale, facts.words) === 'one' ? 'storyEditor.body.words.one' : 'storyEditor.body.words.other', { count: facts.words })
  const minutes = t('storyEditor.body.minutes', { count: facts.minutes })
  const contents = facts.sections >= 2 ? t('storyEditor.body.contents', { count: facts.sections }) : t('storyEditor.body.contentsNone')

  return [words, minutes, contents].join(' · ')
}
