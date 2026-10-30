import { Button } from '@heroui/react'
import { useRef } from 'react'

import { PhotoAddIcon } from '@/components/icons'
import { PhotoThumbOverlay } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { useMediaFile } from '../api/queries'

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** The 44 px picture of a media id: the smallest copy that is wide enough, a spinner over it while the file is processed. */
export function PhotoThumb({ storeId, mediaId }: { storeId: string, mediaId: string }) {
  const media = useMediaFile(storeId, mediaId)
  const variant = media.data?.variants.find(copy => copy.width >= 160) ?? media.data?.variants.at(-1)
  const src = variant?.url ?? media.data?.publicUrl ?? undefined

  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" height={44} loading="lazy" src={src} width={44} />}
      {(media.isError || media.data?.status === 'processing') && <PhotoThumbOverlay failed={media.isError} />}
    </div>
  )
}

/** What is wrong with a photo's file, in words under its name: still processing, or failed. Nothing once it is ready. */
export function PhotoState({ storeId, mediaId }: { storeId: string, mediaId: string }) {
  const { t } = useLocale()
  const media = useMediaFile(storeId, mediaId)

  if (media.isError)
    return <span className="truncate text-xs text-danger" role="status">{t('media.photo.failed')}</span>

  return media.data?.status === 'processing'
    ? <span aria-live="polite" className="truncate text-xs text-muted" role="status">{t('media.photo.processing')}</span>
    : null
}

/** Choose one or more files; each becomes a row at once (see `usePendingPhotos`). */
export function PhotoAdd({ onPick }: { onPick: (files: File[]) => void }) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start max-lg:min-h-11" size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
        <PhotoAddIcon aria-hidden size={16} />
        {t('media.photos.add')}
      </Button>
      <input
        ref={inputRef}
        multiple
        accept={ACCEPT}
        aria-label={t('media.photos.add')}
        className="sr-only"
        data-testid="photo-input"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]

          event.target.value = ''
          if (files.length > 0)
            onPick(files)
        }}
      />
    </div>
  )
}
