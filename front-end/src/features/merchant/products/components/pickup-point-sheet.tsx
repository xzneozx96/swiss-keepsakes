import type { PickupPlace } from '@sk/api-contract'
import type { LocalizedText } from '@sk/domain/catalog'
import type { Language } from '@/contexts/locale-context'

import { Button } from '@heroui/react'
import { closestLanguage, missingText } from '@sk/domain/catalog'
import { pickText } from '@sk/domain/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { pickupQueries } from '@/features/pickup/api/queries'
import { bodyOf, emptyForm, formOf, pickupErrors } from '@/features/pickup/lib/form'
import { HoursRows } from '@/features/places/components/hours-rows'
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
  const body = bodyOf(form)
  const key = useIdempotencyKey({ storeId, id: place?.id, rowVersion, body })
  const failureKey = error && !stale ? (error instanceof ApiProblem ? 'apiFeedback.error.generic' : 'apiFeedback.error.network') : undefined
  const errors = pickupErrors(form)
  const missing = missingText([{ id: 'name', text: form.name }, { id: 'meetingPoint', text: form.address }])

  useFocusFirstInvalid(bodyRef, attempt)

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
      create.submit({ storeId, ...body, idempotencyKey: key.next() }, callbacks)
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
          <div className="flex flex-col items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
            <p>{t('pickup.problem.stale')}</p>
            <Button className="min-h-11" isPending={reloading} variant="secondary" onPress={() => void reload()}>{t('pickup.reload')}</Button>
          </div>
        )}
        {failureKey && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(failureKey)}</p>}
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
