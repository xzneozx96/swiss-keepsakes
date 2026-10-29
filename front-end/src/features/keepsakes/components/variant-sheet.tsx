import type { ProductVariant } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'

import { Button, FieldError, Form, Input, Label, NumberField, Radio, RadioGroup, TextField, toast } from '@heroui/react'
import { useId, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { isSkuCode, toRappen } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'

type Save = (variantId: string, body: { skuCode?: string, priceRappen?: number, status?: 'published' | 'draft' }) => Promise<Outcome>

/**
 * The variant sheet for a keepsake with one variant: the code, the price and whether guests can pick it. E6.2 adds the
 * option chips above the code and the Create variant mode. Stock is not on this sheet; it has its own place (E6.3).
 */
export function VariantSheet({ variant, onSave, onClose }: { variant: ProductVariant, onSave: Save, onClose: () => void }) {
  const { t } = useLocale()
  const formId = useId()
  const [code, setCode] = useState(variant.skuCode)
  const [price, setPrice] = useState<number | undefined>(variant.priceRappen / 100)
  const [status, setStatus] = useState(variant.status)
  const [codeError, setCodeError] = useState<string>()
  const [priceError, setPriceError] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const [isPending, setIsPending] = useState(false)

  const submit = async () => {
    const skuCode = code.trim()
    const priceRappen = toRappen(price)
    const invalidCode = !isSkuCode(skuCode)

    setCodeError(invalidCode ? t(skuCode ? 'keepsakes.variant.codeInvalid' : 'keepsakes.variant.codeRequired') : undefined)
    setPriceError(priceRappen === undefined ? t('keepsakes.variant.priceInvalid') : undefined)
    if (invalidCode || priceRappen === undefined)
      return
    setIsPending(true)
    setFailure(undefined)
    const outcome = await onSave(variant.id, { skuCode, priceRappen, status })

    setIsPending(false)
    if (outcome.ok) {
      toast.success(t('keepsakes.variant.saved', { code: skuCode }))
      onClose()
    }
    else if (outcome.type === 'sku-code-taken') {
      setCodeError(t('keepsakes.variant.codeTaken', { code: skuCode }))
    }
    else {
      setFailure(t(problemMessageKey(outcome.type)))
    }
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" form={formId} isPending={isPending} type="submit">
            {t('keepsakes.variant.save')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>
            {t('keepsakes.variant.cancel')}
          </Button>
        </>
      )}
      title={t('keepsakes.variant.editTitle', { code: variant.skuCode })}
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
        <TextField fullWidth isInvalid={codeError !== undefined} value={code} onChange={(next) => { setCode(next.toUpperCase()); setCodeError(undefined) }}>
          <Label>{t('keepsakes.variant.code')}</Label>
          <Input className="font-mono" maxLength={60} />
          <FieldError>{codeError}</FieldError>
        </TextField>
        <NumberField fullWidth isInvalid={priceError !== undefined} minValue={0} formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} value={price ?? Number.NaN} onChange={(next) => { setPrice(Number.isNaN(next) ? undefined : next); setPriceError(undefined) }}>
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
        {failure && <p className="text-sm text-danger" role="alert">{failure}</p>}
      </Form>
    </SheetFrame>
  )
}
