import type { ProductVariant } from '@sk/api-contract'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { LibraryIcon, PhotoAddIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useMediaFile } from '@/features/media/api/queries'
import { LibraryPicker } from '@/features/media/components/library-picker'
import { TileMark, TileOutline } from '@/features/media/components/tile-mark'
import { TILE_GAPS } from '@/features/media/components/tile-style'
import { KeepsakePhoto } from './keepsake-photo'

/**
 * The photo of a variant, from the API's ready copy (`photo`) or, for a keepsake that is only in the browser, from the
 * library by its id. No photo is the add icon on the tile ground.
 */
export function VariantThumb({ storeId, variant, className = 'size-11 rounded-xl' }: { storeId: string, variant: Pick<ProductVariant, 'mediaId' | 'photo'>, className?: string }) {
  const looked = useMediaFile(storeId, variant.photo ? null : variant.mediaId)
  const media = variant.photo ?? looked.data

  return media
    ? <KeepsakePhoto className={`shrink-0 ${className}`} media={media} width={160} />
    : (
        <span aria-hidden className={`grid shrink-0 place-items-center bg-surface-secondary text-muted ${className}`}>
          <PhotoAddIcon size={18} />
        </span>
      )
}

/** One photo of the keepsake as a choosable tile: the picture, the outline and the mark of the shared tile look. */
function OwnTile({ storeId, mediaId, checked, onPick }: { storeId: string, mediaId: string, checked: boolean, onPick: () => void }) {
  const media = useMediaFile(storeId, mediaId)
  const name = media.data?.name ?? ''

  return (
    <li>
      <button aria-label={name} aria-pressed={checked} className="group relative block w-full rounded-xl outline-none focus-visible:focus-ring" type="button" onClick={onPick}>
        <KeepsakePhoto className="aspect-square w-full rounded-xl" media={media.data} width={320}>
          <TileOutline shown={checked} />
          <TileMark selected={checked} />
        </KeepsakePhoto>
      </button>
    </li>
  )
}

/**
 * The sheet that chooses the photo of a variant: the keepsake's own photos first (one press chooses), then Choose from
 * library, the shared picker with its Upload a photo. A photo the keepsake does not have yet joins its photos
 * (`onChoose` is told by `isNew`, the caller adds it). Remove photo takes it off the variant, not off the keepsake.
 */
export function VariantPhotoPicker({ storeId, isOpen, current, ownIds, onChoose, onRemove, onClose }: {
  storeId: string
  isOpen: boolean
  /** The variant's photo now. */
  current: string | null
  /** The photos of the keepsake, in order. */
  ownIds: string[]
  onChoose: (mediaId: string, isNew: boolean) => void
  onRemove: () => void
  onClose: () => void
}) {
  const { t } = useLocale()
  const [libraryOpen, setLibraryOpen] = useState(false)

  return (
    <>
      <SheetFrame
        footer={(
          <div className="flex w-full flex-1 items-center justify-between gap-2">
            <Button className="min-h-11" isDisabled={current === null} variant="danger-soft" onPress={() => { onRemove(); onClose() }}>{t('keepsakes.variant.photo.remove')}</Button>
            <Button className="min-h-11" variant="tertiary" onPress={onClose}>{t('keepsakes.variant.cancel')}</Button>
          </div>
        )}
        isOpen={isOpen}
        title={t('keepsakes.variant.photo.title')}
        onClose={onClose}
      >
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">{t('keepsakes.variant.photo.own')}</span>
          {ownIds.length > 0
            ? (
                <ul aria-label={t('keepsakes.variant.photo.own')} className={`grid grid-cols-3 sm:grid-cols-4 ${TILE_GAPS}`}>
                  {ownIds.map(id => <OwnTile key={id} checked={id === current} mediaId={id} storeId={storeId} onPick={() => { onChoose(id, false); onClose() }} />)}
                </ul>
              )
            : <p className="text-sm text-muted">{t('keepsakes.variant.photo.empty')}</p>}
          <Button className="self-start max-lg:min-h-11" size="sm" variant="secondary" onPress={() => setLibraryOpen(true)}>
            <LibraryIcon aria-hidden size={16} />
            {t('media.photos.library')}
          </Button>
        </div>
      </SheetFrame>
      <LibraryPicker
        single
        isOpen={libraryOpen}
        room={1}
        storeId={storeId}
        used={[]}
        onAdd={([id]) => {
          if (id) {
            onChoose(id, !ownIds.includes(id))
            onClose()
          }
        }}
        onClose={() => setLibraryOpen(false)}
      />
    </>
  )
}
