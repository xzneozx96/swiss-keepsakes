import type { StoryGroupDetail } from '@sk/api-contract'
import type { GroupFields } from '../lib/group-fields'
import type { StoryLanguage } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { ContentIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { PhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { useStoryOptions } from '../hooks/use-story-options'
import { relatedSummary } from '../lib/details-summary'
import { hiddenFor } from '../lib/linked-lists'
import { LinkedRowsSkeleton } from './linked-rows-skeleton'
import { CollapsibleCard } from './story-details-panel'
import { RelatedSheet } from './story-related-sheet'

/**
 * Up to 3 other stories shown at the end of this one, in the merchant's order (shared by both languages). With none, guests
 * see the newest. A row says when readers of the open language will not see the story: it has no published version in that
 * language. An id the story list no longer has stays as an "Unknown story" row that can be removed.
 */
export function RelatedCard({ storeId, group, language, onChange }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  onChange: (patch: Partial<GroupFields>) => void
}) {
  const { t } = useLocale()
  const { stories, isLoading, isError, refetch } = useStoryOptions(storeId, language, group.relatedGroupIds.length > 0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const byId = new Map(stories.map(option => [option.id, option]))
  const ids = group.relatedGroupIds
  const items = ids.map((id) => {
    const option = byId.get(id)

    return {
      id,
      name: option?.title ?? t('storyLists.related.unknown'),
      thumbnail: (
        <Media alt="" className="size-11 shrink-0 rounded-xl" photo={option?.photo ?? undefined}>
          {!option?.photo && <ContentIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
        </Media>
      ),
      note: option && hiddenFor(option, language) && (
        <span className="truncate text-xs text-muted">{t('storyLists.related.noLanguage', { language: t(`storyEditor.language.${language}`) })}</span>
      ),
    }
  })

  return (
    <CollapsibleCard icon={ContentIcon} id="related" summary={relatedSummary(t, ids.length)} title={t('storyLists.related.title')}>
      <p className="text-xs text-pretty text-muted">{t('storyLists.related.help')}</p>
      {isError && <ErrorNotice compact message={t('storyLists.related.loadFailed')} onRetry={refetch} />}
      {isLoading && ids.length > 0 && <LinkedRowsSkeleton count={ids.length} />}
      {!isLoading && !isError && (
        <PhotoOrder
          items={items}
          labels={{
            list: t('storyLists.related.list'),
            move: (name, position, count) => t('media.photos.move', { name, position, count }),
            moved: (name, position, count) => t('media.photos.moved', { name, position, count }),
            remove: name => t('storyLists.remove', { name }),
          }}
          onChange={relatedGroupIds => onChange({ relatedGroupIds })}
        />
      )}
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>
        {t('storyLists.related.choose', { count: ids.length })}
      </Button>
      {sheetOpen && (
        <RelatedSheet
          language={language}
          ownGroupId={group.id}
          storeId={storeId}
          value={ids}
          onClose={() => setSheetOpen(false)}
          onSave={(relatedGroupIds) => {
            onChange({ relatedGroupIds })
            setSheetOpen(false)
          }}
        />
      )}
    </CollapsibleCard>
  )
}
