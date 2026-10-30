import { useEffect } from 'react'

import { PhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { useMediaNames } from '../api/queries'
import { usePendingPhotos } from '../hooks/use-pending-photos'
import { PhotoAdd, PhotoState, PhotoThumb } from './photo-parts'

/**
 * The photos of a page in one ordered list (the first is the cover), with Add photo for several files at once. Each
 * file becomes a row at once with its own picture and state (uploading, failed with Retry and Remove); a finished
 * upload is handed to `onAdd` and the row turns into a photo. The caller keeps the ids: `onChange` gets a new order or
 * a photo removed, `onAdd` one new id (add it with an update from the current ids, as several uploads can finish in
 * the same moment). A row shows the file's name from the library, "Photo 1" until it is read. The block has no card
 * of its own; the caller puts it in one.
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
  const fileNames = useMediaNames(storeId, ids)
  const room = max - ids.length - photos.pending.length
  const uploading = photos.pending.some(item => item.status === 'uploading')

  useEffect(() => {
    onUploadingChange?.(uploading)
  }, [uploading, onUploadingChange])

  return (
    <div className="flex flex-col gap-4">
      {ids.length > 0 || photos.pending.length > 0
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
        : <p className={`text-sm text-pretty ${showError ? 'text-danger' : 'text-muted'}`} role={showError ? 'alert' : undefined}>{emptyText ?? t('media.photos.empty')}</p>}
      {room > 0
        ? <PhotoAdd onPick={files => photos.add(files.slice(0, room))} />
        : <p className="text-sm text-muted">{t('media.photos.limit', { max, more: max - 1 })}</p>}
    </div>
  )
}
