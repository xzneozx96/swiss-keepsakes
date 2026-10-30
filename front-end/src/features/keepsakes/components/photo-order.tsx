import type { Media } from '@sk/api-contract'

import { PhotoOrder as SharedPhotoOrder } from '@/components/photo-order'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakePhoto } from './keepsake-photo'

/** The keepsake's photos in order: the shared reorder list with the keepsake's words and picture. The first is the cover. */
export function PhotoOrder({ photos, onChange }: { photos: Media[], onChange: (ids: string[]) => void }) {
  const { t } = useLocale()
  const nameOf = (index: number) => t('keepsakes.photos.name', { n: index + 1 })

  return (
    <SharedPhotoOrder
      items={photos.map((photo, index) => ({
        id: photo.id,
        name: nameOf(index),
        thumbnail: <KeepsakePhoto className="size-11 shrink-0 rounded-xl" media={photo} width={160} />,
      }))}
      labels={{
        list: t('keepsakes.photos.list'),
        cover: t('keepsakes.photos.cover'),
        move: (name, position, count) => t('keepsakes.photos.move', { name, position, count }),
        moved: (name, position, count) => t('keepsakes.photos.moved', { name, position, count }),
        remove: name => t('keepsakes.photos.remove', { name }),
      }}
      onChange={onChange}
    />
  )
}
