import { Button } from '@heroui/react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { LibraryIcon, PhotoAddIcon } from '@/components/icons'
import { PhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { useLatest } from '@/hooks/use-latest'
import { useMediaNames } from '../api/queries'
import { useDuplicateCheck } from '../hooks/use-duplicate-check'
import { usePendingPhotos } from '../hooks/use-pending-photos'
import { refusalOf } from '../hooks/use-photo-upload'
import { LibraryPicker } from './library-picker'
import { PhotoAdd, PhotoState, PhotoThumb } from './photo-parts'

/**
 * The photos of a page in one ordered list (the first is the cover), with Add photo for several files at once. Each
 * file becomes a row at once with its own picture and state (uploading, failed with Retry and Remove); a finished
 * upload is handed to `onAdd` and the row turns into a photo. The caller keeps the ids: `onChange` gets a new order or
 * a photo removed, `onAdd` one new id (add it with an update from the current ids, as several uploads can finish in
 * the same moment). A row shows the file's name from the library, "Photo 1" until it is read. The block has no card
 * of its own; the caller puts it in one. Next to Add photo, Choose from library adds photos the store already has
 * (a sheet over the Media library, up to the room left). With no photo at all the block shows an empty state with both.
 * Before a pick goes up, the files the library already holds (by content) are asked about: the existing photo is added
 * with no upload, or the file goes up as a copy (`useDuplicateCheck`).
 */
export function PhotosField({ storeId, ids, max, onChange, onAdd, emptyText, showError = false, onUploadingChange }: {
  storeId: string
  /** The photos in order. */
  ids: string[]
  /** The most photos the page takes. */
  max: number
  onChange: (ids: string[]) => void
  onAdd: (mediaId: string) => void
  /** What the empty list says, when the page has a rule of its own to tell. */
  emptyText?: string
  /** After a blocked publish: the empty text is shown as an alert. */
  showError?: boolean
  /** True while some file is still on its way up (a failed row is not): a page that is not saved yet waits for it. */
  onUploadingChange?: (uploading: boolean) => void
}) {
  const { t } = useLocale()
  const photos = usePendingPhotos(storeId, onAdd)
  const duplicates = useDuplicateCheck(storeId)
  const latest = useLatest({ ids, onAdd })
  // From the pick until its files are rows: the hash, the lookup and the question about duplicates.
  const [checking, setChecking] = useState(false)
  const fileNames = useMediaNames(storeId, ids)
  const room = max - ids.length - photos.pending.length
  const [libraryOpen, setLibraryOpen] = useState(false)
  const empty = ids.length === 0 && photos.pending.length === 0
  const uploading = checking || photos.pending.some(item => item.status === 'uploading')

  const pick = async (files: File[]) => {
    setChecking(true)
    try {
      const decision = await duplicates.resolve(files, file => !refusalOf(file))

      if (!decision)
        return
      // A photo that is already on the page is not added twice.
      for (const existing of decision.reuse.filter(({ id }) => !latest.current.ids.includes(id)))
        latest.current.onAdd(existing.id)
      photos.add(decision.upload)
    }
    finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  const actions = (
    <div className={`flex flex-wrap items-center gap-2 ${empty ? 'justify-center' : ''}`}>
      <PhotoAdd onPick={files => void pick(files.slice(0, room))} />
      <Button className="max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setLibraryOpen(true)}>
        <LibraryIcon aria-hidden size={16} />
        {t('media.photos.library')}
      </Button>
    </div>
  )
  const limit = <p className="text-sm text-muted">{t('media.photos.limit', { max, more: max - 1 })}</p>

  return (
    <div className="flex flex-col gap-4">
      {!empty
        ? (
            <PhotoOrder
              items={ids.map((id, index) => ({
                id,
                name: fileNames[index] || t('media.photos.title', { n: index + 1 }),
                thumbnail: <PhotoThumb mediaId={id} storeId={storeId} />,
                note: <PhotoState mediaId={id} storeId={storeId} />,
              }))}
              labels={{
                list: t('media.photos.list'),
                cover: t('media.photos.cover'),
                move: (name, position, count) => t('media.photos.move', { name, position, count }),
                moved: (name, position, count) => t('media.photos.moved', { name, position, count }),
                remove: name => t('media.photos.remove', { name }),
              }}
              pending={{
                items: photos.pending.map(item => ({
                  id: item.key,
                  name: item.name,
                  previewUrl: item.previewUrl,
                  status: item.status,
                  label: t(item.status === 'uploading' ? 'media.photo.uploading' : 'media.photo.failed'),
                  detail: item.message && item.message !== 'media.photo.failed' ? t(item.message) : undefined,
                })),
                list: t('media.photos.pending'),
                retryText: t('media.photo.retry'),
                retry: name => t('media.photo.retryName', { name }),
                onRetry: photos.retry,
                onRemove: photos.remove,
              }}
              onChange={onChange}
            />
          )
        : <EmptyState compact alert={showError} icon={PhotoAddIcon} message={emptyText ?? t('media.photos.empty')}>{actions}</EmptyState>}
      {!empty && (room > 0 ? actions : limit)}
      {duplicates.dialog}
      <LibraryPicker
        isOpen={libraryOpen}
        room={room}
        storeId={storeId}
        used={ids}
        onAdd={added => added.forEach(onAdd)}
        onClose={() => setLibraryOpen(false)}
      />
    </div>
  )
}
