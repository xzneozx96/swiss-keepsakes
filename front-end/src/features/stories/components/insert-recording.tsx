import type { MediaItem } from '@sk/api-contract'
import type { StoryLanguage } from '../lib/search-params'

import { Button, Skeleton } from '@heroui/react'
import { useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { MusicIcon, UploadIcon } from '@/components/icons'
import { Pager } from '@/components/list-pagination'
import { useLocale } from '@/contexts/locale-context'
import { useMediaList } from '@/features/media/api/queries'
import { FileThumb } from '@/features/media/components/file-thumb'
import { useRecordingUpload } from '../hooks/use-recording-upload'
import { CHOICE_ROW } from './choice-row'
import { ChosenMark } from './chosen-mark'

const PAGE_SIZE = 10
const ACCEPT = 'audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,.m4a'

export type RecordingChoice = Pick<MediaItem, 'id' | 'name' | 'alt'>

function RowsSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-2 p-1">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface-secondary p-3">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
          </span>
        </li>
      ))}
    </ul>
  )
}

/**
 * The Recording tab: only the library's recordings, with their file name and description, and "Upload a recording", which adds to the
 * library and chooses the new file. Never AI voices (PRD).
 */
export function InsertRecording({ storeId, language, selected, onSelect }: {
  storeId: string
  language: StoryLanguage
  selected: string | null
  onSelect: (item: RecordingChoice) => void
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const list = useMediaList(storeId, { kind: 'audio', status: 'processing,ready', page, pageSize: PAGE_SIZE })
  const uploadRecording = useRecordingUpload(storeId)
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const other = language === 'en' ? 'de' : 'en'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{t('storyMedia.audio.intro')}</p>
        <Button className="shrink-0 max-lg:min-h-11" size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
          <UploadIcon aria-hidden size={16} />
          {t('storyMedia.audio.upload')}
        </Button>
        <input
          ref={inputRef}
          accept={ACCEPT}
          aria-label={t('storyMedia.audio.upload')}
          className="sr-only"
          data-testid="recording-input"
          tabIndex={-1}
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0]

            event.target.value = ''
            if (file) {
              void uploadRecording(file).then((uploaded) => {
                if (uploaded)
                  onSelect({ id: uploaded.id, name: uploaded.name, alt: {} })
              })
            }
          }}
        />
      </div>
      {list.isLoading && <RowsSkeleton />}
      {list.isError && !list.data && <EmptyState compact icon={MusicIcon} message={t('storyMedia.audio.loadFailed')} />}
      {list.data && items.length === 0 && <EmptyState compact icon={MusicIcon} message={t('storyMedia.audio.empty')} />}
      {items.length > 0 && (
        <ul className="flex flex-col gap-2 p-1">
          {items.map(item => (
            <li key={item.id}>
              <button aria-pressed={selected === item.id} className={CHOICE_ROW} type="button" onClick={() => onSelect(item)}>
                <FileThumb className="size-10 rounded-xl" item={item} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  <span className="truncate text-xs text-muted">{item.alt[language] || item.alt[other] || t('storyMedia.audio.noDescription')}</span>
                </span>
                {selected === item.id && <ChosenMark />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pager compact pager={{ page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), total, from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, total), go: setPage }} />
    </div>
  )
}
