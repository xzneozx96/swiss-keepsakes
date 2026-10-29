import type { MediaKind } from '@sk/domain/content'
import type { FilterGroup } from '@/components/filter-bar'

import { Button, SearchField } from '@heroui/react'

import { FilterButton } from '@/components/filter-bar'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { MEDIA_KINDS } from '../lib/search-params'

/**
 * Phones: the kind tabs share the full width, search and the buttons sit under them. From 1024 px one row: the tabs
 * fit their labels on the left, search, filter and Select on the right. A tab label is the kind and its count.
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
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div className="lg:w-fit lg:shrink-0">
        <PageTabs
          equal
          label={t('media.filter.kind')}
          selected={kind}
          sticky={false}
          tabs={MEDIA_KINDS.map(id => ({ id, label: `${t(`media.kind.${id}`)} · ${counts[id] ?? '–'}` }))}
          onSelect={onKind}
        />
      </div>
      <div className="flex min-w-0 items-center gap-2 lg:flex-1 lg:justify-end">
        <SearchField aria-label={t('media.search')} className="w-full lg:max-w-xs" value={text} onChange={onText}>
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input className="w-full" placeholder={t('media.search')} />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterButton groups={groups} />
        {kind === 'image' && (
          <Button className="shrink-0 max-lg:h-11" size="sm" variant={selecting ? 'primary' : 'secondary'} onPress={onSelecting}>
            {t(selecting ? 'media.select.stop' : 'media.select.start')}
          </Button>
        )}
      </div>
    </div>
  )
}
