import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { IPhoneMockup } from '@/components/iphone-mockup'
import { LocaleOverride, useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useStoryPreview } from '../hooks/use-story-preview'
import { StoryPreviewPage } from './story-preview-page'

interface SlotProps { group: StoryGroupDetail, language: StoryLanguage, fields: StoryFields }

/** Reads inside `LocaleOverride` so a failure to load a list never blanks the frame, and the labels follow the story language. */
function PreviewContent(props: SlotProps) {
  return <StoryPreviewPage {...useStoryPreview(props)} />
}

/**
 * The story as guests will see it, drawn from the draft in memory: in the shared phone mockup on a laptop, in a plain
 * phone-width outline on a phone (the same frames as the keepsake review).
 */
export function StoryPreviewSlot(props: SlotProps) {
  const { t } = useLocale()
  const wide = useIsWide()
  const content = (
    <LocaleOverride language={props.language}>
      <PreviewContent {...props} />
    </LocaleOverride>
  )

  return wide
    ? <IPhoneMockup label={t('storyPreview.label')} reserve={160}>{content}</IPhoneMockup>
    : <div className="w-full max-w-[391px] overflow-hidden rounded-3xl border border-separator">{content}</div>
}
