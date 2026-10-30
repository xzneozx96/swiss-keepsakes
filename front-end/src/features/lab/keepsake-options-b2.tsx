import type { VariantDraft } from './keepsake-options-b-state'
/**
 * B2: the combinations as a grid (option one down the side, option two across). A sold cell shows its code, a free cell
 * is a + you press. The details of the new variant open under the grid. Edits inline in the Variants step.
 */
import type { OptionDraft } from './keepsake-options-data'

import { Button, Switch } from '@heroui/react'

import { Block } from '@/components/form-block'
import { CheckIcon, PlusIcon, ProductsIcon } from '@/components/icons'
import { Swatch } from '@/features/keepsakes/components/option-parts'
import { CodeField, CombinationStatus, PriceField, StockNote } from './keepsake-options-b-parts'
import { ChoiceChips } from './keepsake-options-parts'
import { combinationName, labelOf, variantAt } from './keepsake-options-rules'

function Corner({ option }: { option: OptionDraft }) {
  return <span className="text-xs font-medium text-muted">{labelOf(option.name)}</span>
}

function Grid({ draft }: { draft: VariantDraft }) {
  const [rowOption, colOption, ...extras] = draft.options
  const extraValues = Object.fromEntries(extras.map(option => [option.ref, draft.values[option.ref] ?? option.values[0]!.ref]))
  const cols = colOption ? colOption.values : [undefined]

  return (
    <div className="flex flex-col gap-3">
      {extras.map(option => (
        <ChoiceChips key={option.ref} label={labelOf(option.name)} value={extraValues[option.ref]} values={option.values} onChange={ref => draft.setValues({ ...draft.values, [option.ref]: ref })} />
      ))}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-max border-separate border-spacing-1">
          <caption className="sr-only">{`Combinations of ${draft.options.map(o => labelOf(o.name)).join(' and ')}. A plus creates a variant; a code is already sold.`}</caption>
          <thead>
            <tr>
              <th className="p-1 text-start" scope="col">
                <Corner option={rowOption!} />
              </th>
              {colOption
                ? cols.map(col => <th key={col!.ref} className="p-1 text-sm font-medium" scope="col">{labelOf(col!.label)}</th>)
                : <th className="p-1 text-sm font-medium" scope="col">Sold as</th>}
            </tr>
          </thead>
          <tbody>
            {rowOption!.values.map(row => (
              <tr key={row.ref}>
                <th className="p-1 pe-3 text-start text-sm font-medium" scope="row">
                  <span className="flex items-center gap-1.5">
                    <Swatch color={row.swatch} />
                    {labelOf(row.label)}
                  </span>
                </th>
                {cols.map((col) => {
                  const values = { ...extraValues, [rowOption!.ref]: row.ref, ...(colOption && col && { [colOption.ref]: col.ref }) }
                  const sold = variantAt(draft.variants, draft.options, values)
                  const picked = draft.options.every(option => draft.values[option.ref] === values[option.ref])
                  const name = combinationName(values, draft.options)

                  return (
                    <td key={col?.ref ?? 'one'} className="p-0">
                      <button
                        aria-label={sold ? `${name}: sold as ${sold.code}` : `Create ${name}`}
                        aria-pressed={picked}
                        className={`flex h-11 w-full min-w-28 flex-col items-center justify-center rounded-xl border-2 px-2 text-xs outline-none focus-visible:focus-ring ${picked ? 'border-accent' : 'border-transparent'} ${sold ? 'bg-default font-mono text-muted' : 'border-dashed bg-transparent text-foreground hover:bg-default'} ${picked && !sold ? 'bg-accent-soft' : ''}`}
                        type="button"
                        onClick={() => draft.setValues(values)}
                      >
                        {sold ? <span className="max-w-28 truncate text-[11px]">{sold.code}</span> : picked ? <CheckIcon aria-hidden size={16} /> : <PlusIcon aria-hidden size={16} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Details({ draft }: { draft: VariantDraft }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3 lg:p-4" data-testid="new-variant">
      <h4 className="text-sm font-semibold">{`New variant: ${combinationName(draft.values, draft.options)}`}</h4>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <CodeField draft={draft} />
        <PriceField draft={draft} />
      </div>
      <Switch className="min-h-11" isSelected={draft.status === 'published'} onChange={on => draft.setStatus(on ? 'published' : 'hidden')}>
        <Switch.Content className="items-center">
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <span className="text-sm">{draft.status === 'published' ? 'On sale: guests can pick it' : 'Hidden: not on the keepsake page'}</span>
        </Switch.Content>
      </Switch>
      <StockNote />
      <div className="flex flex-wrap gap-2">
        <Button className="max-lg:h-11" isDisabled={draft.twin !== undefined} onPress={() => draft.create()}>Create variant</Button>
        <Button className="max-lg:h-11" variant="tertiary" onPress={draft.reset}>Clear</Button>
      </div>
    </div>
  )
}

export function VariantsB2({ draft }: { draft: VariantDraft }) {
  return (
    <Block hint="The combinations you sell. Pick one that is not sold yet." icon={ProductsIcon} title="Variants">
      {draft.noOptions
        ? <p className="text-sm text-pretty text-muted">No options yet, so this keepsake has one variant. Add an option (size, theme, colour…) to sell more than one.</p>
        : <Grid draft={draft} />}
      {!draft.noOptions && (draft.complete ? <CombinationStatus draft={draft} /> : <p className="text-sm text-muted">{draft.free ? 'A + is a combination you do not sell yet. A code is already a variant.' : 'Every combination is already sold. Add an option value to sell more.'}</p>)}
      {draft.complete && !draft.twin && <Details draft={draft} />}
      {draft.notice && <p aria-live="polite" className="text-sm text-success" role="status">{draft.notice}</p>}
    </Block>
  )
}
