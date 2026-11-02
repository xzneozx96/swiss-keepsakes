import type { StepProps } from './step-props'

import { Button, Description, Spinner } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { OpenInMapsIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useAddressFromPosition } from '../hooks/use-address-from-position'
import { addressMayNotMatch } from '../lib/pin-sync'
import { titleIn } from '../lib/preview'
import { Field } from './fields'
import { MapPicker } from './map-picker'
import { MapsLinkField } from './maps-link-field'
import { SyncWarning } from './sync-warning'

interface LatLng { lat: number, lng: number }

function coordinate(value: string, limit: number): number | null {
  const number = Number.parseFloat(value.replace(',', '.'))

  return Number.isFinite(number) && Math.abs(number) <= limit ? Number(number.toFixed(5)) : null
}

/** Step 1: a Google Maps link that sets the position, then the map picker in its own frame for fine-tuning (coordinate fields when the map cannot load) and the address, which fills itself from the position while it is empty. The map link of the pin is made by the server. */
export function StepPlace({ form, patch, storeId }: StepProps) {
  const { t, language } = useLocale()
  const [mapFailed, setMapFailed] = useState(false)
  const located = form.latitude !== null && form.longitude !== null
  const removePosition = () => patch({ latitude: null, longitude: null })
  const pin = located ? { lat: form.latitude!, lng: form.longitude! } : null
  const { filled: addressFilled, looking, fill } = useAddressFromPosition({ storeId, latitude: form.latitude, longitude: form.longitude, address: form.address, patch })
  // Typed by the person in this editor session: what a saved address came from is not stored, so it starts unknown.
  // `typedAt` is where the pin was at the last keystroke, to see whether the pin has moved since.
  const [typed, setTyped] = useState<{ at: LatLng | null } | null>(null)
  const [noneFound, setNoneFound] = useState(false)
  const typedByHand = typed !== null && form.address !== '' && !addressFilled
  const mayNotMatch = typedByHand && addressMayNotMatch(typed.at, pin)
  const typeAddress = (address: string) => {
    patch({ address })
    setTyped(address === '' ? null : { at: pin })
    setNoneFound(false)
  }
  const fillFromPin = async () => {
    setNoneFound(false)
    const found = await fill()

    setTyped(null)
    setNoneFound(!found)
  }

  return (
    <Block hint={t('places.map.help')} icon={OpenInMapsIcon} title={t('places.map.label')}>
      <p className="sr-only" id="places-map-help">{t('places.map.keys')}</p>
      <div className="flex flex-col gap-3">
        <MapsLinkField position={pin} storeId={storeId} onPosition={({ lat, lng }) => patch({ latitude: lat, longitude: lng })} />
        {mapFailed
          ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3">
                <p className="text-sm text-danger" role="alert">{t('places.map.failed')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field inputMode="decimal" label={t('places.map.lat')} value={form.latitude === null ? '' : String(form.latitude)} onChange={value => patch({ latitude: coordinate(value, 90) })} />
                  <Field inputMode="decimal" label={t('places.map.lng')} value={form.longitude === null ? '' : String(form.longitude)} onChange={value => patch({ longitude: coordinate(value, 180) })} />
                </div>
                {located && <Button size="sm" variant="danger-soft" onPress={removePosition}>{t('places.map.clear')}</Button>}
              </div>
            )
          : (
              <MapPicker
                className="h-72 lg:h-80"
                lat={form.latitude}
                lng={form.longitude}
                onFailed={() => setMapFailed(true)}
                onPlace={({ lat, lng }) => patch({ latitude: lat, longitude: lng })}
                title={titleIn(form, language).title || undefined}
                onRemove={removePosition}
              />
            )}
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <Field description={addressFilled ? t('places.address.filled') : typedByHand ? t('places.address.typed') : t('places.address.help')} label={t('places.address.label')} maxLength={300} value={form.address} onChange={typeAddress} />
        <div aria-live="polite" role="status">
          {looking && (
            <Description className="flex items-center gap-1.5">
              <Spinner size="sm" />
              {t('places.address.looking')}
            </Description>
          )}
        </div>
        {mayNotMatch && (
          <SyncWarning text={t('places.address.pinMoved')}>
            <Button size="sm" variant="secondary" onPress={() => void fillFromPin()}>{t('places.address.fill')}</Button>
          </SyncWarning>
        )}
        {noneFound && !looking && <SyncWarning text={t('places.address.none')} />}
      </div>
      <p aria-live="polite" className="sr-only" data-testid="places-position" role="status">
        {located ? t('places.map.position', { lat: form.latitude!, lng: form.longitude! }) : t('places.map.empty')}
      </p>
    </Block>
  )
}
