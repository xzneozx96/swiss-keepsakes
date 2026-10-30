import type { StepProps } from './step-props'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { OpenInMapsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { Block, Field } from './fields'
import { MapPicker } from './map-picker'
import { MapsLinkField } from './maps-link-field'

function coordinate(value: string, limit: number): number | null {
  const number = Number.parseFloat(value.replace(',', '.'))

  return Number.isFinite(number) && Math.abs(number) <= limit ? Number(number.toFixed(5)) : null
}

function RemovePosition({ onPress }: { onPress: () => void }) {
  const { t } = useLocale()

  return <Button size="sm" variant="danger-soft" onPress={onPress}>{t('places.map.clear')}</Button>
}

/** Step 1: a Google Maps link that sets the position, the map picker for fine-tuning (coordinate fields when the map cannot load) and the address. The map link of the pin is made by the server. */
export function StepPlace({ form, patch, storeId }: StepProps) {
  const { t } = useLocale()
  const [mapFailed, setMapFailed] = useState(false)
  const located = form.latitude !== null && form.longitude !== null
  const removePosition = () => patch({ latitude: null, longitude: null })

  return (
    <div className="flex flex-col gap-6">
      <Block hint={t('places.map.help')} icon={OpenInMapsIcon} title={t('places.map.label')}>
        <p className="sr-only" id="places-map-help">{t('places.map.keys')}</p>
        <MapsLinkField position={located ? { lat: form.latitude!, lng: form.longitude! } : null} storeId={storeId} onPosition={({ lat, lng }) => patch({ latitude: lat, longitude: lng })}>
          {mapFailed
            ? (
                <div className="flex flex-col gap-3 border-t border-separator p-3">
                  <p className="text-sm text-danger" role="alert">{t('places.map.failed')}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field inputMode="decimal" label={t('places.map.lat')} value={form.latitude === null ? '' : String(form.latitude)} onChange={value => patch({ latitude: coordinate(value, 90) })} />
                    <Field inputMode="decimal" label={t('places.map.lng')} value={form.longitude === null ? '' : String(form.longitude)} onChange={value => patch({ longitude: coordinate(value, 180) })} />
                  </div>
                  {located && <RemovePosition onPress={removePosition} />}
                </div>
              )
            : (
                <MapPicker attached lat={form.latitude} lng={form.longitude} onFailed={() => setMapFailed(true)} onPlace={({ lat, lng }) => patch({ latitude: lat, longitude: lng })}>
                  {located && <RemovePosition onPress={removePosition} />}
                </MapPicker>
              )}
        </MapsLinkField>
        <p aria-live="polite" className="sr-only" data-testid="places-position" role="status">
          {located ? t('places.map.position', { lat: form.latitude!, lng: form.longitude! }) : t('places.map.empty')}
        </p>
      </Block>
      <Block>
        <Field description={t('places.address.help')} label={t('places.address.label')} maxLength={300} value={form.address} onChange={address => patch({ address })} />
      </Block>
    </div>
  )
}
