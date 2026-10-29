import type { Product, ProductVariant } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { CreateVariant, SaveVariant } from './variants-card'

import { Button, Description, FieldError, Form, Input, Label, NumberField, Radio, RadioGroup, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { isSkuCode, toRappen } from '../lib/keepsake-rules'
import { checkVariantValues, combinationName, suggestCode, variantRefusalText, variantTitle } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { RefusalAlert, ValueChips } from './option-parts'

/**
 * The variant sheet (N15): one value of each option as chips, the SKU code, the price and the status, in Create mode
 * (from the Variants card) and Edit mode (from the variant page). A refusal shows at its field: a duplicate combination
 * or a missing value above the code, a taken code at the code, no price at the price. Stock is not here; it belongs to
 * Inventory (E6.3).
 */
export function VariantSheet({ keepsake, variant, onSave, onCreate, onClose }: {
  keepsake: Product
  /** The variant to edit. Left out, the sheet creates one. */
  variant?: ProductVariant
  onSave: SaveVariant
  onCreate?: CreateVariant
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const formId = useId()
  const { options } = keepsake
  const [values, setValues] = useState<Record<string, string>>(variant?.values ?? {})
  const [code, setCode] = useState(variant?.skuCode ?? '')
  const [price, setPrice] = useState<number | undefined>(variant ? variant.priceRappen / 100 : undefined)
  const [status, setStatus] = useState<'published' | 'draft'>(variant?.status === 'draft' ? 'draft' : 'published')
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<{ values?: string, code?: string, failure?: string }>({})
  const [isPending, setIsPending] = useState(false)
  const others = keepsake.variants.filter(other => other.id !== variant?.id)
  const refusals = tried ? checkVariantValues(options, others, values, 'values', variant?.skuCode ?? '') : []
  const combination = combinationName(values, options, language)
  const valuesError = refusals[0] ? variantRefusalText(t, refusals[0], combination) : server.values
  const trimmed = code.trim()
  const codeError = tried
    ? (!trimmed ? t('keepsakes.variant.codeRequired') : !isSkuCode(trimmed) ? t('keepsakes.variant.codeInvalid') : undefined) ?? server.code
    : server.code
  const priceError = tried && toRappen(price) === undefined ? t('keepsakes.variant.priceInvalid') : undefined
  const suggestion = options.length > 0 && !code && options.every(option => values[option.id]) ? suggestCode(values, options) : ''
  const title = variant ? t('keepsakes.variant.editTitle', { name: variantTitle(variant.values, options, language) || variant.skuCode }) : t('keepsakes.variant.createTitle')

  const submit = async () => {
    setTried(true)
    setServer({})
    const priceRappen = toRappen(price)

    if (checkVariantValues(options, others, values, 'values', variant?.skuCode ?? '').length > 0 || !trimmed || !isSkuCode(trimmed) || priceRappen === undefined)
      return
    setIsPending(true)
    const outcome: Outcome = variant
      ? await onSave(variant.id, { skuCode: trimmed, priceRappen, status, ...(options.length > 0 && { values }) })
      : await onCreate!({ skuCode: trimmed, priceRappen, status, ...(options.length > 0 && { values }) })

    setIsPending(false)
    if (outcome.ok) {
      onClose()

      return
    }
    const first = outcome.refusals?.[0]

    if (outcome.type === 'sku-code-taken')
      setServer({ code: t('keepsakes.variant.codeTaken', { code: trimmed }) })
    else if (first)
      setServer({ values: variantRefusalText(t, first, combination) })
    else
      setServer({ failure: t(problemMessageKey(outcome.type)) })
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" form={formId} isPending={isPending} type="submit">
            {t(variant ? 'keepsakes.variant.save' : 'keepsakes.variants.createSubmit')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>
            {t('keepsakes.variant.cancel')}
          </Button>
        </>
      )}
      title={title}
      onClose={onClose}
    >
      <Form
        className="flex flex-col gap-4"
        id={formId}
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {options.length > 0
          ? (
              <div className="flex flex-col gap-4">
                {options.map(option => (
                  <ValueChips key={option.id} option={option} value={values[option.id]} onChange={(valueId) => { setValues(v => ({ ...v, [option.id]: valueId })); setServer({}) }} />
                ))}
                {valuesError && <RefusalAlert>{valuesError}</RefusalAlert>}
              </div>
            )
          : <p className="text-sm text-pretty text-muted">{t('keepsakes.variant.noOptions')}</p>}
        <TextField fullWidth isRequired isInvalid={codeError !== undefined} value={code} onChange={(next) => { setCode(next.toUpperCase()); setServer(s => ({ ...s, code: undefined })) }}>
          <Label>{t('keepsakes.variant.code')}</Label>
          <Input className="font-mono" maxLength={60} placeholder="VX-S-SWAN" />
          {!codeError && suggestion && (
            <Description>
              <button className="min-h-11 underline underline-offset-4 lg:min-h-0" type="button" onClick={() => setCode(suggestion)}>
                {t('keepsakes.create.variant.use', { code: suggestion })}
              </button>
            </Description>
          )}
          <FieldError>{codeError}</FieldError>
        </TextField>
        <NumberField fullWidth isRequired isInvalid={priceError !== undefined} minValue={0} formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} value={price ?? Number.NaN} onChange={next => setPrice(Number.isNaN(next) ? undefined : next)}>
          <Label>{t('keepsakes.variant.price')}</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="decimal" />
          </NumberField.Group>
          <p className="text-xs text-muted">{t('keepsakes.variant.priceHint')}</p>
          <FieldError>{priceError}</FieldError>
        </NumberField>
        <RadioGroup aria-label={t('keepsakes.variant.status')} value={status} onChange={next => setStatus(next === 'draft' ? 'draft' : 'published')}>
          <Label>{t('keepsakes.variant.status')}</Label>
          <Radio value="published">
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{t('keepsakes.variant.status.published')}</Label>
              <p className="text-xs text-muted">{t('keepsakes.variant.status.publishedHint')}</p>
            </Radio.Content>
          </Radio>
          <Radio value="draft">
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            <Radio.Content>
              <Label>{t('keepsakes.variant.status.hidden')}</Label>
              <p className="text-xs text-muted">{t('keepsakes.variant.status.hiddenHint')}</p>
            </Radio.Content>
          </Radio>
        </RadioGroup>
        {server.failure && <p className="text-sm text-danger" role="alert">{server.failure}</p>}
      </Form>
    </SheetFrame>
  )
}
