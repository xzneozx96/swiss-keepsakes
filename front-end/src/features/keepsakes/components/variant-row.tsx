import type { ProductOption, ProductVariant } from '@sk/api-contract'
import type { Values } from '../lib/option-rules'

import { Button, Checkbox, Input } from '@heroui/react'
import { useState } from 'react'

import { PhotoAddIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { chf, toRappen } from '../lib/keepsake-rules'
import { combinationName, shortLabel, variantTitle } from '../lib/option-rules'
import { Swatch } from './option-parts'
import { StatusText } from './status-text'

const NOT_NUMBER = /[^\d.]/g

/** The photo slot of a row: the tile look of the photo block. A variant has no photo of its own yet (the API has no field for it). */
function PhotoSlot() {
  return (
    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
      <PhotoAddIcon size={18} />
    </span>
  )
}

/** The values of a row as small chips, in option order; "—" for a value the row lacks. */
function RowChips({ options, values, muted = false }: { options: ProductOption[], values: Values, muted?: boolean }) {
  const { language } = useLocale()

  return (
    <ul className={`flex min-w-0 flex-wrap gap-1.5 ${muted ? 'opacity-60' : ''}`}>
      {options.map((option) => {
        const value = option.values.find(candidate => candidate.id === values[option.id])

        return (
          <li key={option.id} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-xs font-medium">
            <Swatch className="size-3" color={value?.swatch ?? null} />
            <span className="truncate">{value ? shortLabel(value.label, language) : '—'}</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A price as a field in a row: it saves when the field is left (a changed, valid price only). A price that is not above
 * CHF 0 is marked and not sent. It remounts under a new `key` when the price changes from elsewhere (a bulk change).
 */
export function PriceInput({ priceRappen, label, onSave, className = 'w-24' }: { priceRappen: number, label: string, onSave: (rappen: number) => void, className?: string }) {
  const [text, setText] = useState(priceRappen > 0 ? (priceRappen / 100).toFixed(2) : '')
  const typed = text === '' ? undefined : Number(text)
  const rappen = toRappen(typed)
  const invalid = rappen === undefined

  return (
    <Input
      aria-invalid={invalid || undefined}
      aria-label={label}
      className={`${className} text-end tabular-nums`}
      inputMode="decimal"
      placeholder="0.00"
      value={text}
      onBlur={() => {
        if (rappen !== undefined && rappen !== priceRappen)
          onSave(rappen)
      }}
      onChange={event => setText(event.target.value.replace(',', '.').replace(NOT_NUMBER, ''))}
    />
  )
}

/** One variant of the table: select, photo, values, price, status and Edit. The price saves on blur. */
export function VariantRow({ variant, options, held, isSelected, onSelect, onPrice, onEdit }: {
  variant: ProductVariant
  options: ProductOption[]
  /** The keepsake is only in the browser: every variant is for sale. */
  held: boolean
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onPrice: (rappen: number) => void
  onEdit: () => void
}) {
  const { t, language } = useLocale()
  const title = options.length > 0 ? variantTitle(variant.values, options, language) : variant.skuCode
  const forSale = held || variant.status === 'published'

  return (
    <li className={`grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl px-2 py-2 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_6.5rem_auto] ${isSelected ? 'bg-default' : ''}`} data-testid="variant-row">
      <Checkbox aria-label={t('keepsakes.variants.select', { name: title })} isSelected={isSelected} onChange={onSelect}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
      <PhotoSlot />
      <div className="flex min-w-0 flex-col gap-1">
        {options.length > 0 ? <RowChips options={options} values={variant.values} /> : <span className="truncate font-medium">{variant.skuCode}</span>}
        <span className="truncate font-mono text-xs text-muted">{variant.skuCode}</span>
      </div>
      <div className="col-start-3 flex min-w-0 items-center gap-3 sm:contents">
        <PriceInput key={variant.priceRappen} label={t('keepsakes.variants.priceOf', { name: title })} priceRappen={variant.priceRappen} onSave={onPrice} />
        <StatusText tone={forSale ? 'success' : 'neutral'}>{t(forSale ? 'keepsakes.variants.onSale' : 'keepsakes.variant.status.hidden')}</StatusText>
        <Button aria-label={t('keepsakes.variants.editVariant', { name: title })} className="ms-auto justify-self-end max-lg:h-11" size="sm" variant="tertiary" onPress={onEdit}>{t('keepsakes.variant.edit')}</Button>
      </div>
    </li>
  )
}

/** A combination that an open option will bring, shown muted until Done makes it. */
export function PreviewRow({ options, values, price }: { options: ProductOption[], values: Values, price: number }) {
  const { t, language, intlLocale } = useLocale()

  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-2 py-2 opacity-60" data-testid="variant-preview">
      <PhotoSlot />
      <span className="truncate text-sm font-medium">{combinationName(values, options, language)}</span>
      <span className="text-sm tabular-nums" title={t('keepsakes.variants.newTag')}>{chf(price, intlLocale)}</span>
    </li>
  )
}
