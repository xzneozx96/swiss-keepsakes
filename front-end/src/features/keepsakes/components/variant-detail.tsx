import type { ProductOption } from '@sk/api-contract'
import type { VariantForm } from '../hooks/use-variant-form'

import { Button, Description, Label, ListBox, Select, Switch } from '@heroui/react'
import { useState } from 'react'

import { ChevronLeftIcon } from '@/components/icons'
import { FIELD_GROUP, FIELD_ROW, InlineField } from '@/components/inline-field'
import { useLocale } from '@/contexts/locale-context'
import { combinationName, labelOf } from '../lib/option-rules'
import { QuietNote } from './option-bits'
import { Swatch } from './option-parts'

/** The off track in a darker tint than HeroUI's default, so an off switch still reads on a grey panel. */
const SWITCH_TRACK = '[--switch-control-bg:color-mix(in_oklab,var(--foreground)_16%,transparent)]'

/** Focus follows the press that opened the detail: the ref callback is stable, so it runs once, when the detail mounts. */
const focusOnMount = (element: HTMLElement | null) => element?.focus()

/** One value of one option, as the app's select. A combination that is sold stays listed, disabled, and says so. */
function ValueSelect({ form, option }: { form: VariantForm, option: ProductOption }) {
  const { t, language } = useLocale()
  const chosen = option.values.find(value => value.id === form.form.values[option.id])
  const name = labelOf(option.name, language)
  const sold = option.values.filter(value => form.soldWith(option.id, value.id))

  return (
    <Select
      fullWidth
      disabledKeys={sold.map(value => value.id)}
      isInvalid={form.shown.values !== undefined && !!form.twin}
      placeholder={t('keepsakes.variants.choose', { option: name.toLowerCase() })}
      selectedKey={chosen?.id ?? null}
      onSelectionChange={key => key !== null && form.setValue(option.id, String(key))}
    >
      <Label>{name}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {option.values.map((value) => {
            const twin = form.soldWith(option.id, value.id)

            return (
              <ListBox.Item key={value.id} id={value.id} textValue={labelOf(value.label, language)}>
                <Swatch color={value.swatch} />
                <span className="flex min-w-0 flex-col">
                  {labelOf(value.label, language)}
                  {twin && <Description className="[.select__value_&]:hidden">{t('keepsakes.variants.exists', { combination: combinationName(twin.values, form.options, language) })}</Description>}
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

const NOT_NUMBER = /[^\d.]/g

/** The price as typed ("39." stays "39."), read as a number for the checks. */
export function PriceRow({ price, invalid, onChange }: { price: number | undefined, invalid: boolean, onChange: (next: number | undefined) => void }) {
  const { t } = useLocale()
  const [text, setText] = useState(price === undefined ? '' : price.toFixed(2))

  return (
    <InlineField
      inputMode="decimal"
      invalid={invalid}
      label={t('keepsakes.variants.price')}
      placeholder="0.00"
      value={text}
      onChange={(next) => {
        const clean = next.replace(',', '.').replace(NOT_NUMBER, '')

        setText(clean)
        onChange(clean === '' ? undefined : Number(clean))
      }}
    />
  )
}

/**
 * One variant, whole: its name as the title, a value of every option, price, code and, for a saved keepsake, whether it
 * is on sale. A new keepsake's variants are all for sale (the create request has no status), so the switch is left out
 * and a line says so. Stock is not here: it belongs to Inventory.
 */
export function VariantDetail({ form, title, held, onArchive }: { form: VariantForm, title: string, held: boolean, onArchive: (id: string) => void }) {
  const { t } = useLocale()
  const isNew = form.editing === 'new'
  const current = form.current
  const heading = form.options.length > 0 ? (form.complete ? form.combination : t('keepsakes.variants.new')) : (current?.skuCode ?? title)

  return (
    <form
      aria-label={isNew ? t('keepsakes.variants.new') : t('keepsakes.variant.editTitle', { name: heading })}
      className="flex w-full max-w-xl flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        void form.submit()
      }}
    >
      <div className="flex flex-col gap-3">
        <Button className="-ms-2 self-start max-lg:h-11 lg:hidden" variant="ghost" onPress={form.close}>
          <ChevronLeftIcon aria-hidden size={16} />
          {t('keepsakes.variants.back')}
        </Button>
        <div className="flex flex-col gap-1">
          <h4 ref={focusOnMount} className="font-serif text-title text-balance outline-none" tabIndex={-1}>{heading}</h4>
          <p className="text-sm text-muted">{t(isNew ? 'keepsakes.variants.stock.new' : 'keepsakes.variants.stock')}</p>
        </div>
      </div>

      {form.options.length > 0 && (
        <div className="flex flex-col gap-2">
          {form.options.map(option => <ValueSelect key={option.id} form={form} option={option} />)}
          {form.shown.values && (
            <QuietNote>
              {form.shown.values}
              {form.openable && (
                <>
                  {' '}
                  <button className="min-h-11 text-sm font-medium text-foreground underline underline-offset-4 lg:min-h-0" type="button" onClick={() => form.open(form.openable!.id)}>{form.openable.skuCode}</button>
                </>
              )}
            </QuietNote>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className={FIELD_GROUP}>
          <PriceRow invalid={form.shown.price !== undefined} price={form.form.price} onChange={form.setPrice} />
          <InlineField mono invalid={form.shown.code !== undefined} label={t('keepsakes.variant.code')} placeholder={form.suggestion || t('keepsakes.variants.skuAuto')} value={form.form.typedCode ?? ''} onChange={form.setCode} />
          {!held && (
            <div className={FIELD_ROW}>
              <Switch className={`${SWITCH_TRACK} w-full`} isSelected={form.form.status === 'published'} onChange={on => form.setStatus(on ? 'published' : 'draft')}>
                <Switch.Content className="min-h-11 w-full flex-row-reverse justify-between font-normal">
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Label className="font-normal">{t('keepsakes.variants.onSale')}</Label>
                </Switch.Content>
              </Switch>
            </div>
          )}
        </div>
        {held && <p className="text-xs text-pretty text-muted">{t('keepsakes.variants.draftSale')}</p>}
        {form.shown.price && <QuietNote>{form.shown.price}</QuietNote>}
        {form.shown.code && <QuietNote>{form.shown.code}</QuietNote>}
      </div>

      {form.failure && <QuietNote>{form.failure}</QuietNote>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        <Button className="max-sm:min-h-12 max-sm:w-full" isPending={form.isPending} type="submit">{t(isNew ? 'keepsakes.variants.add' : 'keepsakes.variant.save')}</Button>
        {current && (
          <Button className="max-sm:h-11 max-sm:self-center sm:me-auto" variant="danger-soft" onPress={() => onArchive(current.id)}>
            {t(held ? 'keepsakes.variants.remove' : 'keepsakes.variant.archive.confirm')}
          </Button>
        )}
      </div>
    </form>
  )
}
