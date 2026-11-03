/** Small pieces V1 to V3 share: the quiet problem line, the notice, the archived list, the price and SKU fields, and Archive with its question. */
import type { ReactNode } from 'react'
import type { Studio } from './variant-design-state'

import { Description, FieldError, Input, Label, NumberField, Switch, TextField } from '@heroui/react'

import { ChevronDownIcon, StatusDangerIcon, StatusSuccessIcon } from '@/components/icons'
import { combinationName } from './keepsake-options-rules'

/** One line in the danger colour with its icon, and an optional way out. No box: the words carry it. */
export function Problem({ children, action }: { children: ReactNode, action?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-sm text-pretty text-danger" role="alert">
      <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
      <span>
        {children}
        {action && <>{' '}{action}</>}
      </span>
    </p>
  )
}

/** What just happened, announced politely. Empty keeps its place in the tree so the next message is read. */
export function Notice({ text }: { text: string }) {
  return (
    <p aria-live="polite" className={text ? 'flex items-center gap-2 text-sm text-success' : 'sr-only'} role="status">
      {text && <StatusSuccessIcon aria-hidden className="shrink-0" size={16} />}
      {text}
    </p>
  )
}

export function TextLink({ children, onPress, tone }: { children: ReactNode, onPress: () => void, tone?: 'danger' }) {
  return (
    <button
      className={`min-h-11 rounded-md text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:underline focus-visible:focus-ring lg:min-h-0 ${tone === 'danger' ? 'text-danger' : 'text-foreground'}`}
      type="button"
      onClick={onPress}
    >
      {children}
    </button>
  )
}

/** Archived variants, folded away: they stay for old orders and can't be put back on sale. */
export function ArchivedList({ studio }: { studio: Studio }) {
  if (studio.archived.length === 0)
    return null

  return (
    <details className="group text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-muted outline-none focus-visible:focus-ring lg:min-h-0 [&::-webkit-details-marker]:hidden">
        {`${studio.archived.length} archived`}
        <ChevronDownIcon aria-hidden className="transition-transform duration-200 group-open:rotate-180" size={14} />
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-muted">
        {studio.archived.map(row => (
          <li key={row.id} className="flex justify-between gap-3">
            <span className="truncate">{studio.options.length > 0 ? combinationName(row.values, studio.options) : row.code}</span>
            <span className="shrink-0 font-mono text-xs">{row.code}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Kept for old orders. An archived variant can’t be put back on sale.</p>
    </details>
  )
}

export function PriceField({ studio, label = 'Price', hideLabel = false, className }: { studio: Studio, label?: string, hideLabel?: boolean, className?: string }) {
  return (
    <NumberField
      fullWidth
      className={className}
      formatOptions={{ style: 'currency', currency: 'CHF', currencyDisplay: 'code' }}
      isInvalid={studio.shown.price !== undefined}
      minValue={0}
      value={studio.draft.price ?? Number.NaN}
      onChange={studio.setPrice}
    >
      <Label className={hideLabel ? 'sr-only' : undefined}>{label}</Label>
      <NumberField.Group>
        <NumberField.Input inputMode="decimal" placeholder="CHF 0.00" />
      </NumberField.Group>
      <FieldError>{studio.shown.price}</FieldError>
    </NumberField>
  )
}

export function SkuField({ studio, focusOnOpen = false }: { studio: Studio, focusOnOpen?: boolean }) {
  const following = studio.draft.typedCode === undefined

  return (
    <TextField fullWidth isInvalid={studio.shown.code !== undefined} value={studio.code} onChange={studio.setCode}>
      <Label>SKU</Label>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- opened on request, so focus follows the press */}
      <Input autoFocus={focusOnOpen} className="font-mono" maxLength={60} placeholder={studio.suggestion || 'VX-M-LUCERNE'} />
      {!studio.shown.code && <Description>{following ? 'Made from the choice. Type to change it.' : 'Capital letters, digits and dashes.'}</Description>}
      <FieldError>{studio.shown.code}</FieldError>
    </TextField>
  )
}

/** The folded details: the SKU and the status in one muted line, and the word that opens them. */
export function DetailsLine({ studio, onOpen }: { studio: Studio, onOpen: () => void }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
      {studio.code ? <span className="font-mono text-xs">{studio.code}</span> : <span>SKU automatic</span>}
      <span aria-hidden>·</span>
      <span>{studio.draft.status === 'published' ? 'On sale' : 'Hidden'}</span>
      <span aria-hidden>·</span>
      <TextLink onPress={onOpen}>Details</TextLink>
    </p>
  )
}

/** The off track in a darker tint than HeroUI's default, so an off switch still reads on a grey panel. */
export const SWITCH_TRACK = '[--switch-control-bg:color-mix(in_oklab,var(--foreground)_16%,transparent)]'

/** On sale, as the one switch: control then words, or words then control across a row (`spread`). */
export function OnSaleSwitch({ studio, spread = false }: { studio: Studio, spread?: boolean }) {
  return (
    <Switch className={`${SWITCH_TRACK} ${spread ? 'w-full' : 'self-start'}`} isSelected={studio.draft.status === 'published'} onChange={on => studio.setStatus(on ? 'published' : 'hidden')}>
      <Switch.Content className={`min-h-11 ${spread ? 'w-full flex-row-reverse justify-between font-normal' : ''}`}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className={spread ? 'font-normal' : undefined}>On sale</Label>
      </Switch.Content>
    </Switch>
  )
}
