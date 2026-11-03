import type { StoryLanguage } from '../lib/search-params'
import type { VersionState } from '../lib/version-state'

import { Button } from '@heroui/react'

import { BackIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'

const toneText = { muted: 'text-muted', warning: 'font-medium text-warning', danger: 'font-medium text-danger', success: 'text-muted' } as const

/**
 * The bar of the story editor, pinned at the top: Back, what is open and its save state, and (on Write) the language
 * switch from 1024 px and the Review button. It bleeds out of the merchant shell's padding, as the sticky tab rows do.
 */
export function StoryHeader({ screen, language, versionState, save, onBack, onReview, switchNode }: {
  screen: 'write' | 'review'
  language: StoryLanguage
  versionState: VersionState
  save: { status: string, tone: 'muted' | 'warning' | 'danger' | 'success' }
  onBack: () => void
  /** Unused on the review screen. */
  onReview: () => void
  /** The compact switch, shown from 1024 px on Write. */
  switchNode: React.ReactNode
}) {
  const { t } = useLocale()
  const isWide = useIsWide()
  const reviewing = screen === 'review'
  const live = versionState === 'published' || versionState === 'editsNotLive'
  const title = reviewing
    ? t('storyEditor.review.title')
    : t('storyEditor.title.line', { language: t(`storyEditor.language.${language}`), state: t(live ? 'storyEditor.state.published' : 'storyEditor.state.draft') })

  return (
    <div className="sticky top-0 z-30 -mx-4 -mt-4 border-b border-separator bg-background/90 backdrop-blur-xl lg:-mx-8 lg:-mt-8">
      <div className="flex h-16 items-center gap-2 px-2 lg:gap-3 lg:px-6">
        <Button isIconOnly aria-label={t(reviewing ? 'storyEditor.back.toWriting' : 'storyEditor.back.toStories')} className="size-11 shrink-0" variant="ghost" onPress={onBack}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{title}</span>
          <span aria-live="polite" className={`truncate text-xs whitespace-nowrap lg:text-sm ${toneText[save.tone]}`} role="status">{save.status}</span>
        </div>
        {!reviewing && (
          <>
            {isWide && switchNode}
            <Button className="shrink-0 max-lg:h-11" onPress={onReview}>{t(isWide ? 'storyEditor.review.button' : 'storyEditor.review.short')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
