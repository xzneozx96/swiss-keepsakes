import type { ProductOption, Sku } from './keepsake-editor-data'
import type { SkuErrors } from './keepsake-editor-rules'
import type { ProductModel } from './keepsake-editor-state'

import { Button, Description, FieldError, Input, Label, NumberField, Radio, RadioGroup, Tag, TagGroup, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { SelectedIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { StatusChip } from '@/components/status-chip'
import { THEME_PHOTO } from './keepsake-editor-data'
import { available, hasErrors, isSoldOut, label, shortLabel, skuErrors, skuState, suggestCode, variantTitle } from './keepsake-editor-rules'
import { PhotoById } from './story-editor-sheets'

/**
 * One SKU (N15): its status chip, stock figures, thumbnail, the value pickers, and the sheet that
 * adds or edits it. The sheet saves the SKU whole or refuses with the reason at the field.
 */

/** The app's selected option (copied from the story editor's tags): red border and the mark. */
export const accentTag
  = 'group relative h-auto min-h-11 items-center justify-start gap-2 rounded-2xl border-2 border-transparent px-3 py-2 before:hidden data-[selected=true]:border-accent data-[selected=true]:bg-default data-[selected=true]:hover:bg-default-hover'

export function TagCheck() {
  return <SelectedIcon aria-hidden className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block" weight="Filled" />
}

export function Swatch({ color, className = 'size-4' }: { color: string | null, className?: string }) {
  // The swatch is data (`product_option_values.swatch`), so its colour is set at runtime.
  return color ? <span aria-hidden className={`inline-block shrink-0 rounded-full border border-separator ${className}`} style={{ backgroundColor: color }} /> : null
}

export function SkuStatusChip({ sku }: { sku: Sku }) {
  const { tone, text } = skuState(sku)

  return <StatusChip tone={tone}>{text}</StatusChip>
}

/**
 * Available over reserved, two deliberate lines that never wrap (owner): "4 available" (or "Sold
 * out" in the danger tone), then "2 reserved" muted when orders hold some. Never joined with " · ".
 */
export function StockLines({ sku, className = '' }: { sku: Sku, className?: string }) {
  const soldOut = isSoldOut(sku)

  return (
    <span className={`flex flex-col tabular-nums ${className}`}>
      <span className={`whitespace-nowrap ${soldOut ? 'font-medium text-danger' : ''}`}>{soldOut ? 'Sold out' : `${available(sku)} available`}</span>
      {sku.held > 0 && <span className="text-xs whitespace-nowrap text-muted">{`${sku.held} reserved`}</span>}
    </span>
  )
}

/** The theme's design (open point: values have no photo today), or the colour swatch. */
export function SkuThumb({ sku, options, fallback }: { sku: Sku, options: ProductOption[], fallback?: string }) {
  const colour = options.find(o => o.values.some(v => v.swatch))
  const swatch = colour?.values.find(v => v.id === sku.values[colour.id])?.swatch ?? null

  return (
    <PhotoById className="size-11 shrink-0 rounded-xl" mediaId={THEME_PHOTO[sku.values['opt-theme'] ?? ''] ?? fallback}>
      {swatch && <Swatch className="absolute end-0.5 bottom-0.5 size-3.5 border-2 border-surface" color={swatch} />}
    </PhotoById>
  )
}

/**
 * One value of one option: chips in the app's selected style. A value with no name yet is left
 * out: its chip would be an empty capsule (the Options sheet adds one empty value to a new option).
 */
export function ValuePicker({ option, value, onChange, error, size = 'lg' }: {
  option: ProductOption
  value: string | undefined
  onChange: (valueId: string) => void
  error?: string
  size?: 'sm' | 'lg'
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <TagGroup
        aria-label={label(option.name)}
        selectedKeys={value ? new Set([value]) : new Set()}
        selectionMode="single"
        size="lg"
        onSelectionChange={(keys) => {
          const [first] = keys === 'all' ? [] : Array.from(keys, String)

          if (first)
            onChange(first)
        }}
      >
        <Label className="text-sm font-medium">{label(option.name)}</Label>
        <TagGroup.List className="flex flex-wrap gap-2">
          {option.values.filter(v => label(v.label)).map(v => (
            <Tag key={v.id} className={`${accentTag} ${size === 'sm' ? 'min-h-10 px-2.5 py-1.5 text-sm' : ''}`} id={v.id} textValue={label(v.label)}>
              <Swatch color={v.swatch} />
              <span className="font-medium">{label(v.label)}</span>
              <TagCheck />
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  )
}

/** A value as a small badge (the variants table's option columns). */
export function ValueBadge({ option, valueId }: { option: ProductOption, valueId: string | undefined }) {
  const v = option.values.find(x => x.id === valueId)

  return v
    ? (
        <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-xs font-medium">
          <Swatch className="size-3" color={v.swatch} />
          <span className="truncate">{shortLabel(v.label)}</span>
        </span>
      )
    : <span className="text-xs text-danger">Missing</span>
}

/**
 * Add or edit one variant in the shared sheet (N15): one value per option, SKU code, price,
 * status. Save refuses a duplicate combination, a missing value, a taken code or no price, each at
 * its field. Stock is not here: it is the inventory's (N13). `tried` shows the errors at once (the
 * lab's refusal states). The variant page shows the stock figures.
 */
export function SkuSheet({ model, start, tried: startTried = false, otherCodes, onClose }: {
  model: ProductModel
  start: Sku
  tried?: boolean
  otherCodes: ReadonlySet<string>
  onClose: () => void
}) {
  const { options } = model.product
  const [draft, setDraft] = useState(start)
  const [tried, setTried] = useState(startTried)
  const isNew = !model.product.skus.some(s => s.id === start.id)
  const errors: SkuErrors = tried ? skuErrors(draft, model.product, otherCodes) : {}
  const set = (patch: Partial<Sku>) => setDraft(d => ({ ...d, ...patch }))

  const save = () => {
    setTried(true)
    if (hasErrors(model.saveSku(draft)))
      return
    toast.success(isNew ? `${draft.code} created, 0 in stock. Set its stock in Inventory.` : `${draft.code} saved.`)
    onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={save}>{isNew ? 'Create variant' : 'Save'}</Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>Cancel</Button>
        </>
      )}
      title={isNew ? 'Create variant' : `Edit ${variantTitle(start.values, options)}`}
      onClose={onClose}
    >
      {options.length > 0
        ? (
            <div className="flex flex-col gap-4">
              {options.map(o => (
                <ValuePicker
                  key={o.id}
                  option={o}
                  value={draft.values[o.id]}
                  onChange={v => set({ values: { ...draft.values, [o.id]: v } })}
                />
              ))}
              {errors.values && (
                <p className="rounded-2xl bg-danger-soft p-3 text-sm text-pretty text-danger-soft-foreground" role="alert">{errors.values}</p>
              )}
            </div>
          )
        : <p className="text-sm text-pretty text-muted">No options yet, so this keepsake has one variant. Add an option (size, theme, colour…) to sell more than one.</p>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <TextField fullWidth isRequired isInvalid={Boolean(errors.code)} value={draft.code} onChange={code => set({ code: code.toUpperCase() })}>
          <Label>SKU code</Label>
          <Input className="font-mono" placeholder="VX-S-SWAN" />
          {!errors.code && options.length > 0 && !draft.code && options.every(o => draft.values[o.id]) && (
            <Description>
              <button className="min-h-11 underline underline-offset-4 lg:min-h-0" type="button" onClick={() => set({ code: suggestCode(draft.values, options) })}>
                {`Use ${suggestCode(draft.values, options)}`}
              </button>
            </Description>
          )}
          <FieldError>{errors.code}</FieldError>
        </TextField>
        <NumberField
          fullWidth
          isRequired
          formatOptions={{ style: 'currency', currency: 'CHF' }}
          isInvalid={Boolean(errors.price)}
          minValue={0}
          value={draft.price ? draft.price / 100 : Number.NaN}
          onChange={v => set({ price: Number.isNaN(v) ? 0 : Math.round(v * 100) })}
        >
          <Label>Price</Label>
          <NumberField.Group>
            <NumberField.Input className="tabular-nums" />
          </NumberField.Group>
          <Description>Guests see it on the keepsake page only.</Description>
          <FieldError>{errors.price}</FieldError>
        </NumberField>
      </div>

      {draft.status !== 'archived' && (
        <RadioGroup aria-label="Status" value={draft.status} onChange={v => set({ status: v as Sku['status'] })}>
          <Label>Status</Label>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 [&_[data-slot=radio]]:mt-0">
            {([['published', 'For sale', 'Guests can pick it'], ['draft', 'Hidden', 'Not on the keepsake page']] as const).map(([id, name, hint]) => (
              <Radio key={id} className="rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground" value={id}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <span className="flex flex-col">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted">{hint}</span>
                  </span>
                </Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      )}
    </SheetFrame>
  )
}
