import type { CreateErrors, CreateRow, OptionDraft } from '../lib/option-rules'

import { Button, Checkbox, FieldError, Input, Label, NumberField, TextField } from '@heroui/react'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { useLocale } from '@/contexts/locale-context'
import { asSaved, variantTitle } from '../lib/option-rules'

/** Every combination of the options, ticked, with a code and a price. The merchant unticks what is not sold. */
export function CreateVariantsStep({ rows, options, errors, tried, suggestion, onChange }: {
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
    <Block id="variants" title={options.length > 0 ? t('keepsakes.create.variants.title', { count: sold.length, total: rows.length }) : t('keepsakes.create.variants.titleOne')}>
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
    </Block>
  )
}
