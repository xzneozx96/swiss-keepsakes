import type { Media } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useRef, useState } from 'react'

import { PhotoAddIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { problemMessageKey, problemTypeOf } from '../lib/problems'
import { PhotoUploadError, uploadPhoto } from '../lib/upload-photo'
import { PhotoOrder } from './photo-order'

/** The photos in order with Add photo (the Details step and the Media card). */
export function PhotosField({ storeId, photos, onChange, onUploaded, showError }: {
  storeId: string
  /** The photos in the order the keepsake has them. */
  photos: Media[]
  onChange: (ids: string[]) => void
  /** A file the worker finished: the caller keeps it so the list can show it. */
  onUploaded: (media: Media) => void
  /** After a blocked publish: the empty list says so in the danger colour. */
  showError: boolean
}) {
  const { t } = useLocale()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<string>()

  const pick = async (file: File) => {
    setBusy(true)
    setRefusal(undefined)
    try {
      const media = await uploadPhoto(storeId, file)

      // A photo already on the keepsake is not added twice.
      onUploaded(media)
      if (!photos.some(photo => photo.id === media.id))
        onChange([...photos.map(photo => photo.id), media.id])
    }
    catch (error) {
      setRefusal(error instanceof PhotoUploadError ? t(`keepsakes.photos.refusal.${error.refusal}`) : t(problemMessageKey(problemTypeOf(error))))
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0
        ? <PhotoOrder photos={photos} onChange={onChange} />
        : <p className={`text-sm text-pretty ${showError ? 'text-danger' : 'text-muted'}`} role={showError ? 'alert' : undefined}>{t('keepsakes.photos.empty')}</p>}
      <input
        ref={inputRef}
        accept="image/jpeg,image/png,image/webp"
        aria-label={t('keepsakes.photos.add')}
        className="sr-only"
        data-testid="photo-input"
        tabIndex={-1}
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0]

          event.target.value = ''
          if (file)
            void pick(file)
        }}
      />
      <Button className="self-start max-lg:min-h-11" isPending={busy} size="sm" variant="secondary" onPress={() => inputRef.current?.click()}>
        <PhotoAddIcon aria-hidden size={16} />
        {t('keepsakes.photos.add')}
      </Button>
      {refusal && <p className="text-sm text-danger" role="alert">{refusal}</p>}
    </div>
  )
}
