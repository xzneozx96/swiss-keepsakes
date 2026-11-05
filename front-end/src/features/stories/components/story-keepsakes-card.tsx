import type { StoryGroupDetail } from '@sk/api-contract'
import type { GroupFields } from '../lib/group-fields'
import type { StoryLanguage } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { ErrorNotice } from '@/components/error-notice'
import { GiftIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { PhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { useKeepsakeOptions } from '../hooks/use-keepsake-options'
import { keepsakesSummary } from '../lib/details-summary'
import { LinkedRowsSkeleton } from './linked-rows-skeleton'
import { CollapsibleCard } from './story-details-panel'
import { KeepsakesSheet } from './story-keepsakes-sheet'

/**
 * Up to 6 published keepsakes the story shows, in the merchant's order (shared by both languages). The rows are the shared
 * `PhotoOrder` (grip, arrow keys, Escape, live region). A keepsake that is no longer published, or that the lookup does not
 * find, stays in the list with a note and can be removed; it still counts toward the 6.
 */
export function KeepsakesCard({ storeId, group, language, onChange }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  onChange: (patch: Partial<GroupFields>) => void
}) {
  const { t } = useLocale()
  const { keepsakes, isLoading, isError, refetch } = useKeepsakeOptions(storeId, language, group.keepsakeProductIds)
  const [sheetOpen, setSheetOpen] = useState(false)
  const byId = new Map(keepsakes.map(option => [option.id, option]))
  const ids = group.keepsakeProductIds
  const items = ids.map((id) => {
    const option = byId.get(id)

    return {
      id,
      name: option?.name || t('storyLists.keepsakes.unknown'),
      thumbnail: (
        <Media alt="" className="size-11 shrink-0 rounded-xl" photo={option?.photo ?? undefined}>
          {!option?.photo && <GiftIcon aria-hidden className="absolute inset-0 m-auto text-foreground/60" size={20} />}
        </Media>
      ),
      note: !option?.published && <span className="truncate text-xs text-muted">{t('storyLists.keepsakes.notPublished')}</span>,
    }
  })

  return (
    <CollapsibleCard icon={GiftIcon} id="keepsakes" summary={keepsakesSummary(t, ids.length)} title={t('storyLists.keepsakes.title')}>
      <p className="text-xs text-pretty text-muted">{t('storyLists.keepsakes.help')}</p>
      {isError && <ErrorNotice compact message={t('storyLists.keepsakes.loadFailed')} onRetry={refetch} />}
      {isLoading && ids.length > 0 && <LinkedRowsSkeleton count={ids.length} />}
      {!isLoading && !isError && (
        <PhotoOrder
          items={items}
          labels={{
            list: t('storyLists.keepsakes.list'),
            move: (name, position, count) => t('media.photos.move', { name, position, count }),
            moved: (name, position, count) => t('media.photos.moved', { name, position, count }),
            remove: name => t('storyLists.remove', { name }),
          }}
          onChange={keepsakeProductIds => onChange({ keepsakeProductIds })}
        />
      )}
      <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheetOpen(true)}>
        {t('storyLists.keepsakes.choose', { count: ids.length })}
      </Button>
      {sheetOpen && (
        <KeepsakesSheet
          language={language}
          storeId={storeId}
          value={ids}
          onClose={() => setSheetOpen(false)}
          onSave={(keepsakeProductIds) => {
            onChange({ keepsakeProductIds })
            setSheetOpen(false)
          }}
        />
      )}
    </CollapsibleCard>
  )
}
