import type { StoryLanguage } from '../lib/search-params'
import type { VersionState } from '../lib/version-state'
import type { LanguageStatusTone } from '@/components/language-version-switch'

import { LanguageVersionSwitch } from '@/components/language-version-switch'
import { useLocale } from '@/contexts/locale-context'
import { STORY_LANGUAGES } from '../lib/search-params'

const tone: Record<VersionState, LanguageStatusTone> = { published: 'success', editsNotLive: 'warning', draft: 'warning', none: 'muted' }

/**
 * Which language version is open, on the shared switch. A version that does not exist reads "Not started" and is started by
 * choosing it (the caller does that). Arrow keys only move the focus; a click, Enter or Space chooses.
 */
export function StoryLanguageSwitch({ versions, selected, onChange, compact = false, publishedOn }: {
  versions: Record<StoryLanguage, { state: VersionState }>
  selected: StoryLanguage
  onChange: (language: StoryLanguage) => void
  compact?: boolean
  /** The day each published version went live, already formatted: its line then reads "Published {date}" (the publish card). */
  publishedOn?: Partial<Record<StoryLanguage, string>>
}) {
  const { t } = useLocale()
  const status = (language: StoryLanguage) => {
    const { state } = versions[language]
    const date = publishedOn?.[language]

    return { text: state === 'published' && date ? t('storyPublish.card.publishedOn', { date }) : t(`storyEditor.state.${state}`), tone: tone[state] }
  }

  return (
    <LanguageVersionSwitch
      compact={compact}
      label={t('storyEditor.language.switch')}
      languages={STORY_LANGUAGES.map(id => ({ id, label: t(`storyEditor.language.${id}`), short: id.toUpperCase() }))}
      selected={selected}
      status={{ en: status('en'), de: status('de') }}
      onChange={onChange}
    />
  )
}
