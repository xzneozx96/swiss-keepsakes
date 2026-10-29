import type { MessageKey } from '@/i18n/en'

import { Button } from '@heroui/react'
import { useRef } from 'react'

import { CameraIcon, TrashIcon, UploadIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMedia } from '../api/queries'
import { usePhotoUpload } from '../hooks/use-photo-upload'

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** The picture of a media id: a placeholder while the file is processed, then the smallest copy that is wide enough. */
export function PhotoPreview({ storeId, mediaId, alt }: { storeId: string, mediaId: string, alt: string }) {
  const { t } = useLocale()
  const media = useMedia(storeId, mediaId)
  const variant = media.data?.variants.find(copy => copy.width >= 480) ?? media.data?.variants.at(-1)
  const src = variant?.url ?? media.data?.publicUrl ?? undefined

  return (
    <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-secondary text-center text-xs text-muted">
      {src
        ? <img alt={alt} className="size-full object-cover" height={96} src={src} width={96} />
        : <span aria-live="polite" className="p-1" role="status">{t(media.isError ? 'places.photo.failed' : 'places.photo.processing')}</span>}
    </div>
  )
}

/**
 * Choose a file, upload it, hand its media id back. `label` names the button for the photo's role
 * ("Choose photo", "Add photo"); a photo that is set gets Change and Remove.
 */
export function PhotoPicker({ storeId, mediaId, alt, chooseLabel, onChange, onRemove }: {
  storeId: string
  mediaId: string | null
  alt: string
  chooseLabel: MessageKey
  onChange: (mediaId: string) => void
  onRemove?: () => void
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const { state, upload } = usePhotoUpload(storeId)
  const busy = state.status === 'uploading'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {mediaId
          ? <PhotoPreview alt={alt} mediaId={mediaId} storeId={storeId} />
          : (
              <div className="grid size-24 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
                <CameraIcon aria-hidden size={24} />
              </div>
            )}
        <div className="flex flex-wrap items-center gap-2">
          <Button isDisabled={busy} size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
            <UploadIcon aria-hidden size={16} />
            {t(mediaId ? 'places.photo.change' : chooseLabel)}
          </Button>
          {mediaId && onRemove && (
            <Button isDisabled={busy} size="sm" variant="tertiary" onPress={onRemove}>
              <TrashIcon aria-hidden size={16} />
              {t('places.photo.remove')}
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        accept={ACCEPT}
        aria-label={t(mediaId ? 'places.photo.change' : chooseLabel)}
        className="sr-only"
        data-testid="places-photo-input"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]

          event.target.value = ''
          if (file)
            void upload(file).then(id => id && onChange(id))
        }}
      />
      {busy && <p aria-live="polite" className="text-sm text-muted" role="status">{t('places.photo.uploading')}</p>}
      {state.status === 'failed' && <p className="text-sm text-danger" role="alert">{t(state.message)}</p>}
    </div>
  )
}
