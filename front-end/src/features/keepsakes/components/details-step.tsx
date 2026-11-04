import type { Language } from '@sk/domain/shared'
import type { KeepsakeText } from '../lib/keepsake-rules'

import { Block } from '@/components/form-block'
import { GiftIcon, PartnersIcon, PhotoAddIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { PhotosField } from '@/features/media/components/photos-field'
import { CommissionField } from '@/features/merchant/products/components/commission-field'
import { MAX_PHOTOS } from '../lib/keepsake-rules'
import { BasicsFields } from './basics-fields'

/**
 * The Details step, the same for a new keepsake and a saved one: the blocks Name and text, Photos and Commission.
 * `showErrors` is on after a blocked publish (saved) or a Next with no name (new); a new keepsake needs a name only,
 * so its text is not marked as required (`nameOnly`).
 */
export function DetailsStep({ storeId, language, value, onValue, photoIds, onPhotos, onAddPhoto, commission, onCommission, showErrors, nameOnly = false, onUploadingChange }: {
  storeId: string
  /** The language the editor's switch has chosen. */
  language: Language
  value: KeepsakeText
  onValue: (next: KeepsakeText) => void
  photoIds: string[]
  onPhotos: (ids: string[]) => void
  /** One finished upload: the caller adds it to the ids from the current list. */
  onAddPhoto: (mediaId: string) => void
  commission: number
  onCommission: (value: number) => void
  showErrors: boolean
  nameOnly?: boolean
  /** True while a photo is still uploading. A keepsake that is not saved yet waits for it before it is created. */
  onUploadingChange?: (uploading: boolean) => void
}) {
  const { t } = useLocale()

  return (
    <>
      <Block icon={GiftIcon} id="basics" title={t('keepsakes.basics.title')}>
        <BasicsFields language={language} nameOnly={nameOnly} showErrors={showErrors} value={value} onChange={onValue} />
      </Block>
      <Block icon={PhotoAddIcon} id="photos" title={t('keepsakes.photos.title')}>
        <PhotosField
          emptyText={t('keepsakes.photos.empty')}
          ids={photoIds}
          max={MAX_PHOTOS}
          showError={showErrors && !nameOnly && photoIds.length === 0}
          storeId={storeId}
          onAdd={onAddPhoto}
          onChange={onPhotos}
          onUploadingChange={onUploadingChange}
        />
      </Block>
      <Block hint={t('products.commission.help')} icon={PartnersIcon} id="commission" title={t('products.commission.title')}>
        <CommissionField help={false} value={commission} onChange={onCommission} />
      </Block>
    </>
  )
}
