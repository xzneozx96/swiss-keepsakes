import type { StepProps } from './step-props'

import { Button } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { hasBeenLive, suggestSlug } from '../lib/form'
import { Block, Field } from './fields'
import { MapPicker } from './map-picker'

function coordinate(value: string, limit: number): number | null {
  const number = Number.parseFloat(value.replace(',', '.'))

  return Number.isFinite(number) && Math.abs(number) <= limit ? Number(number.toFixed(5)) : null
}

/** Step 1: the position (map picker, with coordinate fields when the map cannot load), the map link and the address. */
export function StepPlace({ form, patch, errors, pin, slugTaken }: StepProps) {
  const { t, language } = useLocale()
  const [mapFailed, setMapFailed] = useState(false)
  const suggestion = suggestSlug(language === 'de' ? form.titleDe || form.titleEn : form.titleEn || form.titleDe)
  const located = form.latitude !== null && form.longitude !== null

  return (
    <div className="flex flex-col gap-6">
      <Block hint={t('places.map.help')} title={t('places.map.label')}>
        <p className="sr-only" id="places-map-help">{t('places.map.help')}</p>
        {mapFailed
          ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-danger" role="alert">{t('places.map.failed')}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field inputMode="decimal" label={t('places.map.lat')} value={form.latitude === null ? '' : String(form.latitude)} onChange={value => patch({ latitude: coordinate(value, 90) })} />
                  <Field inputMode="decimal" label={t('places.map.lng')} value={form.longitude === null ? '' : String(form.longitude)} onChange={value => patch({ longitude: coordinate(value, 180) })} />
                </div>
              </div>
            )
          : <MapPicker lat={form.latitude} lng={form.longitude} onFailed={() => setMapFailed(true)} onPlace={({ lat, lng }) => patch({ latitude: lat, longitude: lng })} />}
        <p className="text-sm text-muted" data-testid="places-position">
          {located ? t('places.map.position', { lat: form.latitude!, lng: form.longitude! }) : t('places.map.empty')}
        </p>
        {located && (
          <Button className="w-fit" size="sm" variant="tertiary" onPress={() => patch({ latitude: null, longitude: null })}>{t('places.map.clear')}</Button>
        )}
      </Block>
      <Block hint={t('places.slug.help', { slug: form.slug || suggestion || '…' })} title={t('places.slug.label')}>
        <Field
          error={errors.slug ?? (slugTaken ? 'places.problem.slugTaken' : undefined)}
          label={t('places.slug.input')}
          maxLength={200}
          value={form.slug}
          onChange={slug => patch({ slug })}
        />
        {form.slug === '' && suggestion !== '' && (
          <Button className="w-fit" size="sm" variant="secondary" onPress={() => patch({ slug: suggestion })}>{t('places.slug.suggest', { slug: suggestion })}</Button>
        )}
        {hasBeenLive(pin) && <p className="text-sm text-warning">{t('places.slug.published')}</p>}
      </Block>
      <Block title={t('places.address.label')}>
        <Field description={t('places.address.help')} label={t('places.address.label')} maxLength={300} value={form.address} onChange={address => patch({ address })} />
      </Block>
    </div>
  )
}
