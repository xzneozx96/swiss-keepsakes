import type { MediaKind } from '@sk/domain/content'
import type { FilterGroup } from '@/components/filter-bar'

import { Button } from '@heroui/react'

import { FilterButtons } from '@/components/filter-bar'
import { ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { MEDIA_KINDS } from '../lib/search-params'

/**
 * The shared list toolbar: the kind tabs alone on the first line (a 20rem bar from 1024 px), then the filters and Select at the left of the second
 * line and the search at the right; on phones tabs, filters, search. A tab label is the kind and its count.
 */
export function MediaToolbar({ kind, counts, text, groups, selecting, onKind, onText, onSelecting }: {
  kind: MediaKind
  counts: Record<MediaKind, number | undefined>
  text: string
  groups: FilterGroup[]
  selecting: boolean
  onKind: (kind: MediaKind) => void
  onText: (text: string) => void
  onSelecting: () => void
}) {
  const { t } = useLocale()

  return (
    <ListToolbar
      search={<ListSearch label={t('media.search')} value={text} onChange={onText} />}
      tabs={(
        <div className="w-full lg:w-80">
          <PageTabs
            equal
            label={t('media.filter.kind')}
            selected={kind}
            sticky={false}
            tabs={MEDIA_KINDS.map(id => ({ id, label: t(`media.kind.${id}`), count: counts[id] ?? null }))}
            onSelect={onKind}
          />
        </div>
      )}
      filters={(
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <FilterButtons groups={groups} />
          {kind === 'image' && (
            <Button className="shrink-0 rounded-full max-lg:h-11" variant={selecting ? 'primary' : 'secondary'} onPress={onSelecting}>
              {t(selecting ? 'media.select.stop' : 'media.select.start')}
            </Button>
          )}
        </div>
      )}
    />
  )
}
