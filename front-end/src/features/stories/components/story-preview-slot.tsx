import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { useLocale } from '@/contexts/locale-context'

/** Where the preview of the story (what guests will see, on a phone) goes. T-E4.3h replaces the body and keeps these props. */
export function StoryPreviewSlot(_props: { group: StoryGroupDetail, language: StoryLanguage, fields: StoryFields }) {
  const { t } = useLocale()

  return (
    <div className="grid w-full max-w-sm flex-1 place-items-center rounded-3xl border border-separator bg-surface p-6 text-center text-sm text-muted">
      {t('storyPublish.preview.placeholder')}
    </div>
  )
}
