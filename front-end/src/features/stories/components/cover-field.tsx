import { Button, Spinner } from '@heroui/react'
import { useState } from 'react'

import { PhotoAddIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMediaFile } from '@/features/media/api/queries'
import { LibraryPicker } from '@/features/media/components/library-picker'
import { thumbOf } from '@/features/media/lib/rules'

/**
 * The cover: a media id from the store's library (ADR-004). Empty, it is a dashed button (red with `invalid`); set, it is the
 * photo with Change and Remove. A file that is retired, gone or failed to read says so and offers Change cover; the API
 * refuses such a cover on save (422), so it never reaches a published story.
 */
export function CoverField({ storeId, mediaId, invalid, onChange }: {
  storeId: string
  mediaId: string | null
  invalid: boolean
  onChange: (mediaId: string | null) => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const file = useMediaFile(storeId, mediaId)
  const unavailable = mediaId !== null && (file.isError || file.data?.status === 'retired')
  const src = file.data && !unavailable ? thumbOf(file.data, 960) : null

  return (
    <div className="flex flex-col gap-1.5" id="write-cover">
      <span className="text-sm font-medium">
        {t('storyEditor.cover.picker')}
        <span aria-hidden className="text-danger"> *</span>
      </span>
      {mediaId === null
        ? (
            <button
              className={`flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium outline-none hover:bg-default/50 focus-visible:focus-ring ${invalid ? 'border-danger text-danger' : 'border-separator text-muted'}`}
              type="button"
              onClick={() => setOpen(true)}
            >
              <PhotoAddIcon aria-hidden size={24} />
              {t('storyEditor.cover.add')}
              <span className="text-xs font-normal">{t('storyEditor.cover.addHint')}</span>
            </button>
          )
        : (
            <div className="relative">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-secondary">
                {src && <img alt="" className="absolute inset-0 size-full object-cover" decoding="async" src={src} />}
                {file.data?.status === 'processing' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
                    <Spinner size="sm" />
                  </span>
                )}
              </div>
              {unavailable && <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted" role="status">{t('storyEditor.cover.unavailable')}</p>}
              <span className="absolute end-3 bottom-3 flex gap-2">
                <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setOpen(true)}>{t('storyEditor.cover.change')}</Button>
                <Button isIconOnly aria-label={t('storyEditor.cover.remove')} className="max-lg:size-11" size="sm" variant="secondary" onPress={() => onChange(null)}>
                  <TrashIcon aria-hidden size={16} />
                </Button>
              </span>
            </div>
          )}
      <LibraryPicker
        single
        readyOnly
        chooseLabel={t('storyEditor.cover.use')}
        isOpen={open}
        room={1}
        storeId={storeId}
        title={t('storyEditor.cover.picker')}
        used={[]}
        onAdd={([id]) => {
          if (id)
            onChange(id)
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
