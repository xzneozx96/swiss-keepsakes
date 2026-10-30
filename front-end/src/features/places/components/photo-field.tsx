import { Button } from '@heroui/react'
import { useRef } from 'react'

import { PhotoAddIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMedia } from '../api/queries'
import { usePhotoUpload } from '../hooks/use-photo-upload'

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** The 44 px picture of a media id: the smallest copy that is wide enough, a plain box while the file is processed. */
export function PhotoThumb({ storeId, mediaId }: { storeId: string, mediaId: string }) {
  const media = useMedia(storeId, mediaId)
  const variant = media.data?.variants.find(copy => copy.width >= 160) ?? media.data?.variants.at(-1)
  const src = variant?.url ?? media.data?.publicUrl ?? undefined

  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
      {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" height={44} loading="lazy" src={src} width={44} />}
    </div>
  )
}

/** What is wrong with a photo's file, in words under its name: still processing, or failed. Nothing once it is ready. */
export function PhotoState({ storeId, mediaId }: { storeId: string, mediaId: string }) {
  const { t } = useLocale()
  const media = useMedia(storeId, mediaId)

  if (media.isError)
    return <span className="truncate text-xs text-danger" role="status">{t('places.photo.failed')}</span>

  return media.data?.status === 'processing'
    ? <span aria-live="polite" className="truncate text-xs text-muted" role="status">{t('places.photo.processing')}</span>
    : null
}

/** Choose a file, upload it, hand its media id back. */
export function PhotoAdd({ storeId, onAdd }: { storeId: string, onAdd: (mediaId: string) => void }) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const { state, upload } = usePhotoUpload(storeId)
  const busy = state.status === 'uploading'

  return (
    <div className="flex flex-col gap-2">
      <Button className="self-start max-lg:min-h-11" isDisabled={busy} size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
        <PhotoAddIcon aria-hidden size={16} />
        {t('places.photos.add')}
      </Button>
      <input
        ref={inputRef}
        accept={ACCEPT}
        aria-label={t('places.photos.add')}
        className="sr-only"
        data-testid="places-photo-input"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]

          event.target.value = ''
          if (file)
            void upload(file).then(id => id && onAdd(id))
        }}
      />
      {busy && <p aria-live="polite" className="text-sm text-muted" role="status">{t('places.photo.uploading')}</p>}
      {state.status === 'failed' && <p className="text-sm text-danger" role="alert">{t(state.message)}</p>}
    </div>
  )
}
