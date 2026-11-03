import type { PickupPlace } from '@sk/api-contract'
import type { LocalizedText } from '@sk/domain/catalog'
import type { Language } from '@/contexts/locale-context'

import { Button } from '@heroui/react'
import { closestLanguage, missingText } from '@sk/domain/catalog'
import { pickText } from '@sk/domain/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { Notice } from '@/components/notice'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand, useSubmit } from '@/features/data-client/use-command'
import { pickupQueries } from '@/features/pickup/api/queries'
import { PickupMap } from '@/features/pickup/components/pickup-map'
import { bodyOf, emptyForm, formOf, pickupErrors } from '@/features/pickup/lib/form'
import { pickupLimitType } from '@/features/pickup/lib/problems'
import { HoursRows } from '@/features/places/components/hours-rows'
import { MapsLinkField } from '@/features/places/components/maps-link-field'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { LanguageTabs, LocalizedField, useFocusFirstInvalid } from './editor-parts'

type Texts = 'name' | 'address' | 'instructions'

const localized = (text: LocalizedText) => ({ en: text.en ?? '', de: text.de ?? '' })

/**
 * The add and edit sheet of M14 on the API. Name, address and instructions per language (one language is enough), the
 * week below as the place hours editor. An error shows at its field and sends nothing; a refused save keeps what was
 * typed. A stale save (412) says so and offers Reload, which replaces the draft with the saved point.
 */
export function PickupPointSheet({ storeId, place, onClose }: {
  storeId: string
  /** The point to edit, or none to add one. */
  place?: PickupPlace
  onClose: () => void
}) {
  const { t, language: uiLanguage } = useLocale()
  const client = useDataClient()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() => (place ? formOf(place) : emptyForm()))
  const [rowVersion, setRowVersion] = useState(place?.rowVersion)
  const [language, setLanguage] = useState<Language>(uiLanguage)
  const [tried, setTried] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [reloading, setReloading] = useState(false)
  // Set on the 412, cleared only by a successful Reload: typing must not hide it.
  const [stale, setStale] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  // Every refusal shows inline (the stale notice or the failure line), so the cache stays silent on error.
  const meta = {
    success: (result: PickupPlace) => t('products.place.saved', { name: pickText(result.name, uiLanguage).text }),
    silent: true,
  }
  const create = useSubmit('pickup', 'create', { meta })
  const save = useSubmit('pickup', 'save', { meta })
  const { isPending, error, reset } = place ? save : create
  const addressAt = useCommand('places', 'addressAt', { meta: { silent: true } })
  // The address the register gave for the link, so a second link may replace it while the merchant has not typed over it.
  const filledRef = useRef<string | null>(null)
  const [mapFailed, setMapFailed] = useState(false)
  const full = bodyOf(form)
  // A save sends the link only when it changed: the API follows a link on every send, and an unrelated edit must not depend on Google answering.
  const { mapsLink: sentLink, ...rest } = full
  const body = place && sentLink === place.mapsLink ? rest : full
  const key = useIdempotencyKey({ storeId, id: place?.id, rowVersion, body })
  const linkRefused = error instanceof ApiProblem && error.type === 'maps-link-unreadable'
  const failureKey = error && !stale && !linkRefused
    ? (error instanceof ApiProblem ? (error.type === pickupLimitType ? 'pickup.problem.limit' : 'apiFeedback.error.generic') : 'apiFeedback.error.network')
    : undefined
  const errors = pickupErrors(form)
  const missing = missingText([{ id: 'name', text: form.name }, { id: 'meetingPoint', text: form.address }])

  useFocusFirstInvalid(bodyRef, attempt)

  /** A link was read: the pin moves, and the address is filled from the register unless the merchant has written one. */
  const movePin = (position: { lat: number, lng: number }) => {
    setForm(f => ({ ...f, position }))
    addressAt.mutate({ storeId, latitude: position.lat, longitude: position.lng }, {
      onSuccess: ({ formatted }) => {
        setForm((f) => {
          const empty = f.address.en === '' && f.address.de === ''
          const mine = filledRef.current !== null && f.address.en === filledRef.current && f.address.de === filledRef.current

          filledRef.current = formatted

          return empty || mine ? { ...f, address: { en: formatted, de: formatted } } : f
        })
      },
    })
  }

  const edit = (change: Partial<typeof form>) => {
    setForm(f => ({ ...f, ...change }))
  }

  const submit = () => {
    if (errors.count > 0) {
      setTried(true)
      if (errors.name || errors.address)
        setLanguage(closestLanguage(missing))
      setAttempt(n => n + 1)

      return
    }
    const callbacks = {
      onSuccess: () => {
        key.settled()
        onClose()
      },
      onError: (failed: Error) => {
        key.settled(failed)
        if (failed instanceof ApiProblem && failed.type === 'precondition-failed')
          setStale(true)
      },
    }

    if (place && rowVersion !== undefined)
      save.submit({ storeId, id: place.id, ifMatch: rowVersion, ...body, idempotencyKey: key.next() }, callbacks)
    else
      create.submit({ storeId, ...full, idempotencyKey: key.next() }, callbacks)
  }

  /** Reads the point again and puts its saved text in the fields, as the keepsake editor's Reload does. */
  const reload = async () => {
    if (!place)
      return
    setReloading(true)
    try {
      const { items } = await queryClient.fetchQuery(pickupQueries.list(client, storeId, false))
      const fresh = items.find(item => item.id === place.id)

      if (!fresh) {
        onClose()

        return
      }
      setForm(formOf(fresh))
      setRowVersion(fresh.rowVersion)
      setStale(false)
      reset()
    }
    catch {
      // The notice stays; a second press tries again.
    }
    finally {
      setReloading(false)
    }
  }

  const field = (id: Texts, label: string, lang: Language, rows?: number) => (
    <LocalizedField
      isInvalid={tried && id !== 'instructions' && errors[id]}
      label={label}
      language={lang}
      rows={rows}
      value={form[id]}
      onChange={text => edit({ [id]: localized(text) })}
    />
  )

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth isPending={isPending} onPress={submit}>
            {t('products.place.save')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t(place ? 'products.place.edit' : 'pickup.sheet.add')}
      onClose={onClose}
    >
      <div ref={bodyRef} className="flex flex-col gap-5">
        {stale && (
          <Notice actions={<Button className="min-h-11" isPending={reloading} variant="secondary" onPress={() => void reload()}>{t('pickup.reload')}</Button>} status="warning">
            {t('pickup.problem.stale')}
          </Notice>
        )}
        {failureKey && <Notice status="danger">{t(failureKey)}</Notice>}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">{t('pickup.location.title')}</h3>
          <p className="text-xs text-pretty text-muted">{t('pickup.location.help')}</p>
          <MapsLinkField
            key={rowVersion ?? 'new'}
            error={linkRefused ? 'pickup.mapsLink.refused' : tried && errors.mapsLink ? 'pickup.mapsLink.required' : undefined}
            help="pickup.mapsLink.help"
            link={form.mapsLink}
            position={form.position}
            storeId={storeId}
            unreadable="pickup.mapsLink.unreadable"
            onLink={link => edit(link === '' ? { mapsLink: '', position: null } : { mapsLink: link })}
            onPosition={movePin}
          />
          {mapFailed
            ? <p className="text-sm text-danger" role="alert">{t('pickup.map.failed')}</p>
            : <PickupMap lat={form.position?.lat ?? null} lng={form.position?.lng ?? null} title={pickText(form.name, uiLanguage).text || undefined} onFailed={() => setMapFailed(true)} />}
        </section>
        <LanguageTabs missing={missing} selected={language} onChange={setLanguage}>
          {lang => (
            <>
              {field('name', t('products.field.name'), lang)}
              {field('address', t('products.field.address'), lang, 2)}
              {field('instructions', t('products.field.instructions'), lang, 3)}
            </>
          )}
        </LanguageTabs>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('pickup.hours.title')}</h3>
          <p className="text-xs text-pretty text-muted">{t('pickup.hours.help')}</p>
          <HoursRows errors={errors.hours} hours={form.hours} onChange={hours => edit({ hours })} />
        </section>
      </div>
    </SheetFrame>
  )
}
