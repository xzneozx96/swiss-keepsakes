import type { Language } from '@sk/domain/shared'
import type { KeepsakeText } from '../lib/keepsake-rules'
import type { CreateErrors, CreateRow, OptionDraft } from '../lib/option-rules'

import { Button, Checkbox, FieldError, Input, Label, NumberField, TextField } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { BackIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { useOptionsDraft } from '../hooks/use-options-draft'
import { usePhotoLibrary } from '../hooks/use-photo-library'
import { LANGUAGES, nameIn, suggestSkuCode } from '../lib/keepsake-rules'
import { asSaved, createErrors, createRows, optionsBody, variantsOfRows, variantTitle } from '../lib/option-rules'
import { problemMessageKey, problemTypeOf, refusalsOf } from '../lib/problems'
import { KEEPSAKES_PATH } from '../lib/search-params'
import { BasicsFields } from './basics-fields'
import { CreateSkeleton } from './editor-skeleton'
import { KeepsakeCard } from './keepsake-card'
import { KeepsakeGate } from './keepsake-gate'
import { OptionsEditor, OptionsProblems } from './option-blocks'
import { PhotosField } from './photos-field'
import { useLeaveGuard } from './use-leave-guard'

/** The steps of the create flow. E6.3 adds Stock after them, with its message key `keepsakes.create.step.<id>`. */
const STEPS = ['details', 'options', 'variants'] as const

type StepId = (typeof STEPS)[number]

const empty: KeepsakeText = { name: { en: '', de: '' }, text: { en: '', de: '' } }

/** Every combination of the options, ticked, with a code and a price. The merchant unticks what is not sold. */
function VariantsStep({ rows, options, errors, tried, suggestion, onChange }: {
  rows: CreateRow[]
  /** A code made from the name, offered for the one variant of a keepsake with no option. */
  suggestion: string
  options: OptionDraft[]
  errors: CreateErrors
  tried: boolean
  onChange: (rows: CreateRow[]) => void
}) {
  const { t, language } = useLocale()
  const saved = asSaved(options)
  const sold = rows.filter(row => row.sold)
  const [all, setAll] = useState<number>()
  const titleOf = (row: CreateRow) => (options.length > 0 ? variantTitle(row.values, saved, language) : t('keepsakes.create.variants.titleOne'))
  const patch = (key: string, change: Partial<CreateRow>) => onChange(rows.map(row => (row.key === key ? { ...row, ...change } : row)))

  return (
    <KeepsakeCard id="variants" title={options.length > 0 ? t('keepsakes.create.variants.title', { count: sold.length, total: rows.length }) : t('keepsakes.create.variants.titleOne')}>
      <p className="text-sm text-pretty text-muted">{t(options.length > 0 ? 'keepsakes.create.variants.hint' : 'keepsakes.create.variant.hint')}</p>
      {tried && sold.length === 0 && <p className="text-sm text-danger" role="alert">{t('keepsakes.create.variants.tickOne')}</p>}
      {sold.length > 1 && (
        <div className="flex items-end gap-2">
          <NumberField className="max-w-48" formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} minValue={0} value={all ?? Number.NaN} onChange={next => setAll(Number.isNaN(next) ? undefined : next)}>
            <Label>{t('keepsakes.create.variants.priceAll')}</Label>
            <NumberField.Group>
              <NumberField.Input inputMode="decimal" />
            </NumberField.Group>
          </NumberField>
          <Button className="min-h-11" isDisabled={all === undefined || all <= 0} variant="secondary" onPress={() => onChange(rows.map(row => (row.sold ? { ...row, price: all } : row)))}>
            {t('keepsakes.create.variants.apply')}
          </Button>
        </div>
      )}
      <ul className="flex flex-col divide-y divide-separator">
        {rows.map((row) => {
          const title = titleOf(row)
          const error = tried ? errors[row.key] : undefined

          return (
            <li key={row.key} className="flex flex-col gap-2 py-3" data-row={row.key}>
              {options.length > 0
                ? (
                    <Checkbox isSelected={row.sold} onChange={sold => patch(row.key, { sold })}>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label className="text-sm font-medium">{title}</Label>
                        <span className="sr-only">{t('keepsakes.create.variants.sell', { title })}</span>
                      </Checkbox.Content>
                    </Checkbox>
                  )
                : <span className="text-sm font-medium">{title}</span>}
              {row.sold
                ? (
                    <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                      <TextField fullWidth isInvalid={error?.code !== undefined} value={row.code} onChange={code => patch(row.key, { code: code.toUpperCase() })}>
                        <Label className="sr-only">{t('keepsakes.create.variants.codeFor', { title })}</Label>
                        <Input className="font-mono" maxLength={60} placeholder={t('keepsakes.variant.code')} />
                        {options.length === 0 && !row.code && suggestion && (
                          <button className="min-h-11 self-start text-sm underline underline-offset-4 lg:min-h-0" type="button" onClick={() => patch(row.key, { code: suggestion })}>
                            {t('keepsakes.create.variant.use', { code: suggestion })}
                          </button>
                        )}
                        <FieldError>{error?.code === 'twice' ? t('keepsakes.create.variants.codeTwice') : error?.code === 'invalid' ? t('keepsakes.variant.codeInvalid') : t('keepsakes.variant.codeRequired')}</FieldError>
                      </TextField>
                      <NumberField fullWidth formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} isInvalid={error?.price === true} minValue={0} value={row.price ?? Number.NaN} onChange={price => patch(row.key, { price: Number.isNaN(price) ? undefined : price })}>
                        <Label className="sr-only">{t('keepsakes.create.variants.priceFor', { title })}</Label>
                        <NumberField.Group>
                          <NumberField.Input inputMode="decimal" />
                        </NumberField.Group>
                        <FieldError>{t('keepsakes.variant.priceInvalid')}</FieldError>
                      </NumberField>
                    </div>
                  )
                : <p className="text-xs text-muted">{t('keepsakes.create.variants.notSold')}</p>}
            </li>
          )
        })}
      </ul>
    </KeepsakeCard>
  )
}

function CreateFlow({ storeId }: { storeId: string }) {
  const { t, language } = useLocale()
  const navigate = useNavigate()
  // A refusal shows at the code field or in `failure`, so the cache's error toast is off.
  const create = useSubmit('keepsakes', 'create', {
    meta: { success: created => t(created.variants.length === 1 ? 'keepsakes.toast.created.one' : 'keepsakes.toast.created', { name: nameIn(created.name, language), count: created.variants.length }), silent: true },
  })
  const library = usePhotoLibrary([])
  const draft = useOptionsDraft({ saved: [], variants: [] })
  const [step, setStep] = useState<StepId>('details')
  const [value, setValue] = useState(empty)
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [rows, setRows] = useState<CreateRow[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [tried, setTried] = useState(false)
  const [failure, setFailure] = useState<string>()
  const index = STEPS.indexOf(step)
  const last = index === STEPS.length - 1
  const hasName = LANGUAGES.some(l => value.name[l].trim() !== '')
  const touched = hasName || LANGUAGES.some(l => value.text[l].trim() !== '') || photoIds.length > 0 || draft.options.length > 0
  const name = Object.fromEntries(LANGUAGES.filter(l => value.name[l].trim()).map(l => [l, value.name[l].trim()])) as Partial<Record<Language, string>>
  const text = Object.fromEntries(LANGUAGES.filter(l => value.text[l].trim()).map(l => [l, value.text[l].trim()])) as Partial<Record<Language, string>>
  const body = { name, text, photoIds, options: optionsBody(draft.options), variants: variantsOfRows(rows) }
  const key = useIdempotencyKey({ storeId, ...body })
  const found = createErrors(rows)
  const guard = useLeaveGuard({
    isUnsaved: touched,
    titleKey: 'keepsakes.discard.title',
    bodyKey: 'keepsakes.discard.body',
    confirmKey: 'keepsakes.discard.confirm',
    cancelKey: 'keepsakes.discard.cancel',
    onLeave: () => void navigate({ to: KEEPSAKES_PATH }),
  })

  const submit = () => {
    setTried(true)
    if (found.none || Object.keys(found.rows).length > 0)
      return
    setFailure(undefined)
    create.submit({ storeId, ...body, idempotencyKey: key.next() }, {
      onSuccess: (created) => {
        key.settled()
        void navigate({ to: '/store/products/gifts/$productId', params: { productId: created.id } })
      },
      onError: (error) => {
        key.settled(error)
        if (problemTypeOf(error) === 'sku-code-taken')
          setFailure(t('keepsakes.problem.skuTaken'))
        else if (refusalsOf(error).length > 0)
          draft.setProblems(refusalsOf(error))
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
    if (step === 'options') {
      if (draft.check().length > 0)
        return
      setRows(current => createRows(draft.options, current))
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
        {step === 'options' && (
          <KeepsakeCard id="options" title={t('keepsakes.create.options.title')}>
            <p className="text-sm text-pretty text-muted">{t('keepsakes.create.options.hint')}</p>
            <OptionsProblems problems={draft.problems} />
            <OptionsEditor draft={draft} />
          </KeepsakeCard>
        )}
        {step === 'variants' && (
          <VariantsStep errors={found.rows} options={draft.options as OptionDraft[]} rows={rows} suggestion={suggestSkuCode(nameIn(name, language))} tried={tried} onChange={setRows} />
        )}
        {failure && <p className="text-sm text-danger" role="alert">{failure}</p>}
        {step === 'variants' && draft.problems.length > 0 && <OptionsProblems problems={draft.problems} />}
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

/** The create flow: Details, Options, then the combinations that are sold, then Create keepsake, which makes a draft and opens its page. */
export function CreateKeepsake() {
  return (
    <KeepsakeGate fallback={<CreateSkeleton />}>
      {storeId => <CreateFlow storeId={storeId} />}
    </KeepsakeGate>
  )
}
