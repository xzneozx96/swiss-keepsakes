import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { SaveVariant } from '../lib/variant-actions'

import { Button, Description, FieldError, Form, Input, Label, ListBox, NumberField, Select, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { isSkuCode, toRappen } from '../lib/keepsake-rules'
import { checkVariantValues, combinationName, suggestCode, variantRefusalText, variantTitle } from '../lib/option-rules'
import { problemMessageKey } from '../lib/problems'
import { RefusalAlert, ValueChips } from './option-parts'
import { VariantPhotoPicker, VariantThumb } from './variant-photo'

/**
 * The variant sheet (N15), opened by Edit on a row of the merged step: one value of each option as chips, the photo, the
 * SKU code (only while the SKU switch is on, and optional), the price, the status and Archive. A refusal shows at its field: a duplicate combination or a missing value above the code, a
 * taken code at the code, no price at the price. A keepsake that is only in the browser has no status, and removes instead
 * of archiving. Stock is not here; it belongs to Inventory (E6.3).
 */
export function VariantSheet({ storeId, options, variants, variant, held, skuOn, codeBase, ownPhotos, onSave, onAddPhoto, onArchive, onClose }: {
  storeId: string
  options: ProductOption[]
  variants: ProductVariant[]
  variant: ProductVariant
  held: boolean
  /** The SKU switch is on: the code field shows. */
  skuOn: boolean
  /** The keepsake code a suggested code starts with ('' with none). */
  codeBase: string
  /** The keepsake's photos, which the photo sheet offers first. */
  ownPhotos: string[]
  onSave: SaveVariant
  /** A photo that the variant takes and the keepsake does not have joins the keepsake's photos. */
  onAddPhoto: (mediaId: string) => void
  onArchive: () => void
  onClose: () => void
}) {
  const { t, language } = useLocale()
  const formId = useId()
  const [values, setValues] = useState<Record<string, string>>(variant.values)
  const [code, setCode] = useState(variant.skuCode ?? '')
  const [mediaId, setMediaId] = useState(variant.mediaId)
  const [photoIsNew, setPhotoIsNew] = useState(false)
  const [picking, setPicking] = useState(false)
  const [price, setPrice] = useState<number | undefined>(variant.priceRappen > 0 ? variant.priceRappen / 100 : undefined)
  const [status, setStatus] = useState<'published' | 'draft'>(variant.status === 'draft' ? 'draft' : 'published')
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<{ values?: string, code?: string, failure?: string }>({})
  const [isPending, setIsPending] = useState(false)
  const others = variants.filter(other => other.id !== variant.id)
  const refusals = tried ? checkVariantValues(options, others, values, 'values', variant.skuCode ?? '') : []
  const combination = combinationName(values, options, language)
  const valuesError = refusals[0] ? variantRefusalText(t, refusals[0], combination) : server.values
  const trimmed = code.trim()
  const codeError = tried
    ? (trimmed && !isSkuCode(trimmed) ? t('keepsakes.variant.codeInvalid') : undefined) ?? server.code
    : server.code
  const priceError = tried && toRappen(price) === undefined ? t('keepsakes.variant.priceInvalid') : undefined
  const suggestion = skuOn && options.length > 0 && !code && options.every(option => values[option.id]) ? suggestCode(values, options, codeBase) : ''
  const title = t('keepsakes.variant.editTitle', { name: variantTitle(variant.values, options, language) || variant.skuCode || '' })

  const submit = async () => {
    setTried(true)
    setServer({})
    const priceRappen = toRappen(price)

    if (checkVariantValues(options, others, values, 'values', variant.skuCode ?? '').length > 0 || (trimmed && !isSkuCode(trimmed)) || priceRappen === undefined)
      return
    setIsPending(true)
    // A photo that the keepsake does not have yet joins its photos first, then the variant takes it.
    if (photoIsNew && mediaId)
      onAddPhoto(mediaId)
    const outcome: Outcome = await onSave(variant.id, { ...(skuOn && { skuCode: trimmed || null }), ...(mediaId !== variant.mediaId && { mediaId }), priceRappen, ...(!held && { status }), ...(options.length > 0 && { values }) })

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
        <div className="flex w-full flex-1 items-center justify-between gap-2">
          <Button className="min-h-11" isDisabled={isPending} variant="danger-soft" onPress={onArchive}>
            {t(held ? 'keepsakes.variants.remove' : 'keepsakes.variant.archive')}
          </Button>
          <div className="flex items-center gap-2">
            <Button className="min-h-11" variant="tertiary" onPress={onClose}>
              {t('keepsakes.variant.cancel')}
            </Button>
            <Button className="min-h-11" form={formId} isPending={isPending} type="submit">
              {t('keepsakes.variant.save')}
            </Button>
          </div>
        </div>
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
        {options.length > 0 && (
          <div className="flex flex-col gap-4">
            {options.map(option => (
              <ValueChips key={option.id} option={option} value={values[option.id]} onChange={(valueId) => { setValues(v => ({ ...v, [option.id]: valueId })); setServer({}) }} />
            ))}
            {valuesError && <RefusalAlert>{valuesError}</RefusalAlert>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <VariantThumb className="size-16 rounded-2xl" storeId={storeId} variant={{ mediaId, photo: mediaId === variant.mediaId ? variant.photo : null }} />
          <div className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">{t('keepsakes.variant.photo.label')}</span>
            <div className="flex items-center gap-2">
              <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setPicking(true)}>{t(mediaId ? 'keepsakes.variant.photo.changeShort' : 'keepsakes.variant.photo.addShort')}</Button>
              {mediaId && <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => { setMediaId(null); setPhotoIsNew(false) }}>{t('keepsakes.variant.photo.remove')}</Button>}
            </div>
          </div>
        </div>
        {skuOn && (
          <TextField fullWidth isInvalid={codeError !== undefined} value={code} onChange={(next) => { setCode(next.toUpperCase()); setServer(s => ({ ...s, code: undefined })) }}>
            <Label>{t('keepsakes.variant.code')}</Label>
            <Input className="font-mono" maxLength={60} placeholder={codeBase ? `${codeBase}-S` : '1.6795-S'} />
            {!codeError && suggestion && (
              <Description>
                <button className="min-h-11 underline underline-offset-4 lg:min-h-0" type="button" onClick={() => setCode(suggestion)}>
                  {t('keepsakes.create.variant.use', { code: suggestion })}
                </button>
              </Description>
            )}
            <FieldError>{codeError}</FieldError>
          </TextField>
        )}
        <NumberField fullWidth isRequired isInvalid={priceError !== undefined} minValue={0} formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }} value={price ?? Number.NaN} onChange={next => setPrice(Number.isNaN(next) ? undefined : next)}>
          <Label>{t('keepsakes.variant.price')}</Label>
          <NumberField.Group>
            <NumberField.Input inputMode="decimal" />
          </NumberField.Group>
          <p className="text-xs text-muted">{t('keepsakes.variant.priceHint')}</p>
          <FieldError>{priceError}</FieldError>
        </NumberField>
        {!held && (
          <Select fullWidth selectedKey={status} onSelectionChange={key => key !== null && setStatus(key === 'draft' ? 'draft' : 'published')}>
            <Label>{t('keepsakes.variant.status')}</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="published" textValue={t('keepsakes.variant.status.published')}>
                  {t('keepsakes.variant.status.published')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="draft" textValue={t('keepsakes.variant.status.hidden')}>
                  {t('keepsakes.variant.status.hidden')}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        )}
        {server.failure && <p className="text-sm text-danger" role="alert">{server.failure}</p>}
      </Form>
      {picking && <VariantPhotoPicker current={mediaId} isOpen ownIds={ownPhotos} storeId={storeId} onChoose={(id, isNew) => { setMediaId(id); setPhotoIsNew(isNew) }} onClose={() => setPicking(false)} onRemove={() => { setMediaId(null); setPhotoIsNew(false) }} />}
    </SheetFrame>
  )
}
