import type { Language } from '@sk/domain/shared'
import type { KeepsakeText } from '../lib/keepsake-rules'

import { Button, FieldError, Input, Label, NumberField, TextField, toast } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { BackIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { usePhotoLibrary } from '../hooks/use-photo-library'
import { isSkuCode, LANGUAGES, nameIn, suggestSkuCode, textOf, toRappen } from '../lib/keepsake-rules'
import { problemMessageKey, problemTypeOf } from '../lib/problems'
import { KEEPSAKES_PATH } from '../lib/search-params'
import { BasicsFields } from './basics-fields'
import { CreateSkeleton } from './editor-skeleton'
import { KeepsakeCard } from './keepsake-card'
import { KeepsakeGate } from './keepsake-gate'
import { PhotosField } from './photos-field'
import { useLeaveGuard } from './use-leave-guard'

/**
 * The steps of the create flow. E6.2 puts Options between these two and E6.3 puts Stock after them, each with its
 * message key `keepsakes.create.step.<id>` and a branch in `Step`.
 */
const STEPS = ['details', 'variants'] as const

type StepId = (typeof STEPS)[number]

const empty: KeepsakeText = { name: { en: '', de: '' }, text: { en: '', de: '' } }

function VariantStep({ name, code, price, errors, onCode, onPrice }: {
  name: string
  code: string
  price: number | undefined
  errors: { code?: string, price?: string }
  onCode: (code: string) => void
  onPrice: (price: number | undefined) => void
}) {
  const { t } = useLocale()
  const suggestion = suggestSkuCode(name)

  return (
    <KeepsakeCard id="variant" title={t('keepsakes.create.variant.title')}>
      <p className="text-sm text-pretty text-muted">{t('keepsakes.create.variant.hint')}</p>
      <TextField fullWidth isRequired isInvalid={errors.code !== undefined} value={code} onChange={next => onCode(next.toUpperCase())}>
        <Label>{t('keepsakes.variant.code')}</Label>
        <Input className="font-mono" maxLength={60} />
        <FieldError>{errors.code}</FieldError>
        {!code && suggestion && (
          <button className="min-h-11 self-start text-sm underline underline-offset-4 lg:min-h-0" type="button" onClick={() => onCode(suggestion)}>
            {t('keepsakes.create.variant.use', { code: suggestion })}
          </button>
        )}
      </TextField>
      <NumberField fullWidth isRequired formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} isInvalid={errors.price !== undefined} minValue={0} value={price ?? Number.NaN} onChange={next => onPrice(Number.isNaN(next) ? undefined : next)}>
        <Label>{t('keepsakes.variant.price')}</Label>
        <NumberField.Group>
          <NumberField.Input inputMode="decimal" />
        </NumberField.Group>
        <p className="text-xs text-muted">{t('keepsakes.variant.priceHint')}</p>
        <FieldError>{errors.price}</FieldError>
      </NumberField>
    </KeepsakeCard>
  )
}

function CreateFlow({ storeId }: { storeId: string }) {
  const { t, language } = useLocale()
  const navigate = useNavigate()
  const create = useSubmit('keepsakes', 'create')
  const library = usePhotoLibrary([])
  const [step, setStep] = useState<StepId>('details')
  const [value, setValue] = useState(empty)
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [price, setPrice] = useState<number>()
  const [showErrors, setShowErrors] = useState(false)
  const [errors, setErrors] = useState<{ code?: string, price?: string }>({})
  const [failure, setFailure] = useState<string>()
  const index = STEPS.indexOf(step)
  const last = index === STEPS.length - 1
  const hasName = LANGUAGES.some(l => value.name[l].trim() !== '')
  const touched = hasName || LANGUAGES.some(l => value.text[l].trim() !== '') || photoIds.length > 0 || code !== '' || price !== undefined
  const name = Object.fromEntries(LANGUAGES.filter(l => value.name[l].trim()).map(l => [l, value.name[l].trim()])) as Partial<Record<Language, string>>
  const text = Object.fromEntries(LANGUAGES.filter(l => value.text[l].trim()).map(l => [l, value.text[l].trim()])) as Partial<Record<Language, string>>
  const body = { name, text, photoIds, variants: [{ skuCode: code.trim(), priceRappen: toRappen(price) ?? 0 }] }
  const key = useIdempotencyKey({ storeId, ...body })
  const guard = useLeaveGuard({
    isUnsaved: touched,
    titleKey: 'keepsakes.discard.title',
    bodyKey: 'keepsakes.discard.body',
    confirmKey: 'keepsakes.discard.confirm',
    cancelKey: 'keepsakes.discard.cancel',
    onLeave: () => void navigate({ to: KEEPSAKES_PATH }),
  })

  const submit = () => {
    const skuCode = code.trim()
    const priceRappen = toRappen(price)
    const next = {
      code: isSkuCode(skuCode) ? undefined : t(skuCode ? 'keepsakes.variant.codeInvalid' : 'keepsakes.variant.codeRequired'),
      price: priceRappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined,
    }

    setErrors(next)
    if (next.code || next.price || priceRappen === undefined)
      return
    setFailure(undefined)
    create.submit({ storeId, ...body, variants: [{ skuCode, priceRappen }], idempotencyKey: key.next() }, {
      onSuccess: (created) => {
        key.settled()
        toast.success(t('keepsakes.toast.created', { name: nameIn(created.name, language), count: created.variants.length }))
        void navigate({ to: '/store/products/gifts/$productId', params: { productId: created.id } })
      },
      onError: (error) => {
        key.settled(error)
        if (problemTypeOf(error) === 'sku-code-taken')
          setErrors({ code: t('keepsakes.variant.codeTaken', { code: skuCode }) })
        else
          setFailure(t(problemMessageKey(problemTypeOf(error))))
      },
    })
  }

  const next = () => {
    if (step === 'details' && !hasName) {
      setShowErrors(true)

      return
    }
    if (last)
      submit()
    else
      setStep(STEPS[index + 1]!)
  }

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-8" data-testid="create-flow">
      <header className="flex items-center gap-2">
        <Button isIconOnly aria-label={t('keepsakes.back.toKeepsakes')} className="size-11 shrink-0" variant="ghost" onPress={guard.leave}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-heading">{t('keepsakes.create.title')}</h1>
          <p className="text-sm text-muted">{t('keepsakes.create.stepOf', { step: index + 1, count: STEPS.length, name: t(`keepsakes.create.step.${step}`) })}</p>
        </div>
      </header>
      <ol aria-label={t('keepsakes.create.steps')} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STEPS.map((id, i) => (
          <li key={id} aria-current={id === step ? 'step' : undefined} className={id === step ? 'font-semibold' : 'text-muted'}>{`${i + 1}. ${t(`keepsakes.create.step.${id}`)}`}</li>
        ))}
      </ol>
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4">
        {step === 'details' && (
          <>
            <KeepsakeCard id="basics" title={t('keepsakes.basics.title')}>
              <BasicsFields nameOnly showErrors={showErrors} value={value} onChange={setValue} />
            </KeepsakeCard>
            <KeepsakeCard id="photos" title={t('keepsakes.photos.title')}>
              <PhotosField photos={library.photosOf(photoIds)} showError={false} storeId={storeId} onChange={setPhotoIds} onUploaded={library.add} />
            </KeepsakeCard>
          </>
        )}
        {step === 'variants' && (
          <VariantStep code={code} errors={errors} name={nameIn(textOf(name), language)} price={price} onCode={(next) => { setCode(next); setErrors(e => ({ ...e, code: undefined })) }} onPrice={(next) => { setPrice(next); setErrors(e => ({ ...e, price: undefined })) }} />
        )}
        {failure && <p className="text-sm text-danger" role="alert">{failure}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-16 z-20 flex gap-2 border-t border-separator bg-surface px-4 py-3 lg:static lg:mx-auto lg:w-full lg:max-w-[880px] lg:border-0 lg:bg-transparent lg:p-0">
        {index > 0 && (
          <Button className="min-h-11 flex-1 lg:flex-none" variant="secondary" onPress={() => setStep(STEPS[index - 1]!)}>{t('keepsakes.create.back')}</Button>
        )}
        <Button className="min-h-11 flex-1 lg:flex-none" isPending={create.isPending} onPress={next}>
          {last ? t('keepsakes.create.submit') : t('keepsakes.create.next', { step: t(`keepsakes.create.step.${STEPS[index + 1]!}`) })}
        </Button>
      </div>
      {guard.dialog}
    </div>
  )
}

/** The create flow: Details, then the one variant, then Create keepsake, which makes a draft and opens its page. */
export function CreateKeepsake() {
  return (
    <KeepsakeGate fallback={<CreateSkeleton />}>
      {storeId => <CreateFlow storeId={storeId} />}
    </KeepsakeGate>
  )
}
