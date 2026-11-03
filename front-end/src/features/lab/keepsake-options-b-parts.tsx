/** Pieces the variant designs share: the variants list, the code and price fields, the On sale row and the stock line. */
import type { VariantDraft } from './keepsake-options-b-state'

import { Description, FieldError, Input, Label, NumberField, Switch, TextField } from '@heroui/react'

import { StatusSuccessIcon } from '@/components/icons'
import { StatusChip } from '@/components/status-chip'
import { RefusalAlert } from '@/features/keepsakes/components/option-parts'
import { combinationName } from './keepsake-options-rules'

/** The variants that exist, one line each. The twin of a combination that is already sold can be marked. */
export function VariantList({ draft, markId }: { draft: VariantDraft, markId?: string }) {
  const possible = draft.options.reduce((n, option) => n * option.values.length, 1)

  return (
    <div className="flex flex-col gap-2">
      {draft.variants.length === 0
        ? <p className="text-sm text-pretty text-muted">No variants yet.</p>
        : (
            <ul aria-label="Variants" className="flex flex-col divide-y divide-separator rounded-2xl bg-surface-secondary px-3" data-testid="variant-list">
              {draft.variants.map(variant => (
                <li key={variant.id} className={`flex items-center gap-3 py-2 ${markId === variant.id ? '-mx-3 rounded-xl bg-danger-soft px-3' : ''}`} data-variant={variant.id}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{combinationName(variant.values, draft.options)}</span>
                    <span className="flex items-center gap-2">
                      <span className="truncate font-mono text-xs text-muted">{variant.code}</span>
                      {variant.status === 'hidden' && <StatusChip tone="neutral">Hidden</StatusChip>}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end text-sm tabular-nums">
                    <span>{`CHF ${variant.price.toFixed(2)}`}</span>
                    <span className="text-xs text-muted">{`${variant.stock} in stock`}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
      {draft.options.length > 0 && <p className="text-xs text-muted">{`Only these combinations are sold: ${draft.variants.length} of ${possible} possible. Stock is set in Inventory.`}</p>}
      {draft.options.length === 0 && <p className="text-xs text-muted">With no options, the keepsake has exactly one variant.</p>}
      {draft.notice && <p aria-live="polite" className="text-sm text-success" role="status">{draft.notice}</p>}
    </div>
  )
}

/** The answer to "is this combination free?", live, in words with an icon. Nothing chosen yet: a hint. */
export function CombinationStatus({ draft }: { draft: VariantDraft }) {
  if (draft.noOptions)
    return draft.blocked ? <p className="text-sm text-pretty text-muted">No options, so this keepsake has one variant, and it exists. Add an option to sell more than one.</p> : null
  if (draft.twin && draft.shown.values)
    return <RefusalAlert>{draft.shown.values}</RefusalAlert>
  if (draft.complete) {
    return (
      <p className="flex items-center gap-2 text-sm text-success" role="status">
        <StatusSuccessIcon aria-hidden size={16} />
        <span>{`${combinationName(draft.values, draft.options)} is not sold yet.`}</span>
      </p>
    )
  }

  return <p className="text-sm text-muted" role="status">{draft.shown.values ?? `Choose ${draft.options.map(option => option.name.en.toLowerCase()).join(' and ')} to see if it is sold already.`}</p>
}

export function CodeField({ draft, compact = false }: { draft: VariantDraft, compact?: boolean }) {
  const followed = draft.typedCode === undefined && draft.suggestion !== ''

  return (
    <TextField fullWidth isRequired isInvalid={draft.shown.code !== undefined} value={draft.typedCode ?? draft.suggestion} onChange={draft.setCode}>
      <Label className={compact ? 'sr-only' : undefined}>SKU code</Label>
      <Input className="font-mono" maxLength={60} placeholder={compact ? 'SKU code' : 'VX-S-SWAN'} />
      {!compact && <Description>{followed ? 'Suggested from your choice. Type to change it.' : 'Capital letters, digits and dashes.'}</Description>}
      <FieldError>{draft.shown.code}</FieldError>
    </TextField>
  )
}

export function PriceField({ draft, compact = false }: { draft: VariantDraft, compact?: boolean }) {
  return (
    <NumberField
      fullWidth
      isRequired
      formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }}
      isInvalid={draft.shown.price !== undefined}
      minValue={0}
      value={draft.price ?? Number.NaN}
      onChange={next => draft.setPrice(Number.isNaN(next) ? undefined : next)}
    >
      <Label className={compact ? 'sr-only' : undefined}>Price</Label>
      <NumberField.Group>
        <NumberField.Input inputMode="decimal" placeholder={compact ? 'Price, CHF' : undefined} />
      </NumberField.Group>
      <FieldError>{draft.shown.price}</FieldError>
    </NumberField>
  )
}

/** On sale as a bordered row with a switch, a bold label and one help line (the Medusa pattern, for the one thing that is a yes or no). */
export function OnSaleRow({ draft }: { draft: VariantDraft }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-separator p-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-sm font-semibold text-foreground" id="on-sale-label">On sale</span>
        <span className="text-sm text-pretty text-muted">{draft.status === 'published' ? 'Guests can pick it on the keepsake page.' : 'Hidden: not on the keepsake page.'}</span>
      </div>
      <Switch aria-labelledby="on-sale-label" className="min-h-11 shrink-0" isSelected={draft.status === 'published'} onChange={on => draft.setStatus(on ? 'published' : 'hidden')}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch>
    </div>
  )
}

/** Stock is not set here. Said once, in plain text, instead of a disabled field. */
export function StockNote() {
  return <p className="rounded-2xl bg-surface-secondary p-3 text-sm text-pretty text-muted">A new variant starts with 0 in stock. Set it in Inventory.</p>
}
