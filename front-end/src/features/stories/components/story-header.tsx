import type { StoryLanguage } from '../lib/search-params'
import type { VersionState } from '../lib/version-state'

import { TrashIcon } from '@/components/icons'
import { EditorHeader } from '@/components/layout/editor-header'
import { useLocale } from '@/contexts/locale-context'

const statusTone = { published: 'success', editsNotLive: 'warning', draft: 'neutral', none: 'neutral' } as const

/**
 * The story editor on the shared editor header: Back, the story's name (or "Review and publish") over "English · Draft ·
 * Saved 10:07", the compact switch from 1024 px and Review and publish on Write, and Delete story as its one icon action.
 */
export function StoryHeader({ screen, title, language, versionState, save, onBack, onReview, onDelete, switchNode }: {
  screen: 'write' | 'review'
  /** The story's title as typed, or "Untitled story". */
  title: string
  language: StoryLanguage
  versionState: VersionState
  save: { status: string, tone: 'muted' | 'warning' | 'danger' | 'success' }
  onBack: () => void
  /** Unused on the review screen. */
  onReview: () => void
  onDelete: () => void
  /** The compact switch; the header shows it from 1024 px on Write. */
  switchNode: React.ReactNode
}) {
  const { t } = useLocale()
  const reviewing = screen === 'review'
  const live = versionState === 'published' || versionState === 'editsNotLive'

  return (
    <EditorHeader
      actions={[{ id: 'delete', label: t('storyEditor.menu.delete'), icon: TrashIcon, isDanger: true }]}
      backLabel={t(reviewing ? 'storyEditor.back.toWriting' : 'storyEditor.back.toStories')}
      languageSwitch={reviewing ? undefined : switchNode}
      primary={reviewing ? undefined : { label: t('storyEditor.review.button'), shortLabel: t('storyEditor.review.short'), onPress: onReview }}
      save={{ text: save.status, tone: save.tone }}
      status={{
        tone: statusTone[versionState],
        label: t('storyEditor.title.line', { language: t(`storyEditor.language.${language}`), state: t(live ? 'storyEditor.state.published' : 'storyEditor.state.draft') }),
      }}
      title={reviewing ? t('storyEditor.review.title') : title}
      onAction={onDelete}
      onBack={onBack}
    />
  )
}
