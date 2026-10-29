import type { Keepsake } from './keepsake-editor-data'
import type { Go } from './keepsake-editor-nav'
import type { OptionsSource } from './keepsake-editor-options'
import type { CreateRow } from './keepsake-editor-rules'
import type { LabState } from './keepsake-editor-search-params'
import type { Catalog } from './keepsake-editor-state'

import { Button, Checkbox, FieldError, Input, Label, NumberField, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { ArrowRightIcon, BackIcon, CheckIcon, PlusIcon } from '@/components/icons'
import { QuantityBox } from '@/components/quantity-stepper'
import { swissCardDraft } from './keepsake-editor-data'
import { OptionsEditor, Refusal, useOptionsDraft } from './keepsake-editor-options'
import { BackButton, BasicsFields, PhotoOrder } from './keepsake-editor-parts'
import { buildKeepsake, createErrors, createRows, label, optionsProblems, variantTitle } from './keepsake-editor-rules'
import { SkuThumb } from './keepsake-editor-sku'
import { MediaInsertSheet } from './story-editor-sheets'

/**
 * Create a keepsake (from the list's Create): a focused full-screen flow, not the read page
 * (Medusa's create modal). Every combination of the options is offered ticked; the merchant
 * unticks what is not sold and sets code and price per row or for all at once. Only ticked rows
 * become variants (sparse, ADR-017); zero options give exactly one. The keepsake is created as a
 * draft and opens on its product page, where it is published.
 *
 * Four steps: Details, Options, Variants, Stock; the last one's button is Create keepsake.
 */

type Step = 'details' | 'options' | 'variants' | 'stock'

const STEPS: Step[] = ['details', 'options', 'variants', 'stock']
const STEP_LABEL: Record<Step, string> = { details: 'Details', options: 'Options', variants: 'Variants', stock: 'Stock' }

/** The step a lab state opens on. */
function startStep(start?: LabState) {
  return STEPS.indexOf(start === 'create-options' ? 'options' : start === 'create-variants' ? 'variants' : start === 'create-stock' ? 'stock' : 'details')
}

/** The SwissCard example after the variants step: two combinations unticked, prices and stock set. */
function presetRows(draft: Keepsake): CreateRow[] {
  const unticked = new Set(['opt-colour=v-blue|opt-theme=v-pilatus', 'opt-colour=v-black|opt-theme=v-chapel'])

  return createRows(draft.options).map((r, i) => ({ ...r, sold: !unticked.has(r.key), price: 3900, onHand: i % 4 === 3 ? 0 : 6 }))
}

function emptyDraft(): Keepsake {
  return { id: 'new', isNew: true, status: 'draft', name: { en: '', de: '' }, text: { en: '', de: '' }, photos: [], commissionRate: 0.1, options: [], skus: [] }
}

function VariantRows({ rows, options, errors, onChange }: {
  rows: CreateRow[]
  options: Keepsake['options']
  errors: ReturnType<typeof createErrors> | null
  onChange: (key: string, patch: Partial<CreateRow>) => void
}) {
  const [bulk, setBulk] = useState(Number.NaN)
  const sold = rows.filter(r => r.sold)

  return (
    <section aria-label="Variants" className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{options.length ? `${sold.length} of ${rows.length} combinations ticked` : 'One variant'}</h2>
        <p className="text-sm text-pretty text-muted">
          {options.length
            ? 'Untick the combinations you don’t sell. Only the ticked ones become variants; you can add others later.'
            : 'No options, so the keepsake is sold as one variant. Go back to add options.'}
        </p>
      </div>
      {sold.length > 1 && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface-secondary p-3">
          <NumberField aria-label="Price for every ticked variant" className="w-36" formatOptions={{ style: 'currency', currency: 'CHF' }} minValue={0} value={bulk} onChange={setBulk}>
            <Label className="text-sm">Price for all ticked</Label>
            <NumberField.Group>
              <NumberField.Input className="tabular-nums" />
            </NumberField.Group>
          </NumberField>
          <Button className="max-lg:h-11" isDisabled={!(bulk > 0)} size="sm" variant="secondary" onPress={() => sold.forEach(r => onChange(r.key, { price: Math.round(bulk * 100) }))}>Apply</Button>
        </div>
      )}
      {errors?.none && <Refusal text="Tick at least one combination." />}
      <ul className="flex flex-col divide-y divide-separator">
        {rows.map((r) => {
          const title = variantTitle(r.values, options)
          const e = errors?.rows[r.key]

          return (
            <li key={r.key} className={`grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-2 gap-y-2 py-3 lg:grid-cols-[2.75rem_minmax(0,1fr)_11rem_8rem] lg:gap-x-3 ${r.sold ? '' : 'text-muted'}`}>
              <Checkbox aria-label={`Sell ${title}`} className="grid size-11 place-items-center" isDisabled={!options.length} isSelected={r.sold} onChange={on => onChange(r.key, { sold: on })}>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox>
              <span className="flex min-h-11 min-w-0 items-center gap-3">
                <SkuThumb options={options} sku={{ id: r.key, code: r.code, price: r.price, status: 'published', values: r.values, onHand: 0, held: 0 }} />
                <span className="truncate text-sm font-medium">{title}</span>
              </span>
              {r.sold
                ? (
                    <div className="col-start-2 grid grid-cols-2 gap-2 lg:col-span-2 lg:col-start-3 lg:grid-cols-[11rem_8rem] lg:gap-3">
                      <TextField aria-label={`SKU code of ${title}`} isInvalid={Boolean(e?.code)} value={r.code} onChange={code => onChange(r.key, { code: code.toUpperCase() })}>
                        <Input className="font-mono text-sm" placeholder="SKU code" />
                        <FieldError>{e?.code}</FieldError>
                      </TextField>
                      <NumberField aria-label={`Price of ${title}`} formatOptions={{ style: 'currency', currency: 'CHF' }} isInvalid={Boolean(e?.price)} minValue={0} value={r.price ? r.price / 100 : Number.NaN} onChange={v => onChange(r.key, { price: Number.isNaN(v) ? 0 : Math.round(v * 100) })}>
                        <NumberField.Group>
                          <NumberField.Input className="text-end tabular-nums" placeholder="Price" />
                        </NumberField.Group>
                        <FieldError>{e?.price}</FieldError>
                      </NumberField>
                    </div>
                  )
                : <span className="col-start-2 text-sm lg:col-span-2 lg:col-start-3 lg:flex lg:min-h-11 lg:items-center">Not sold</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function CreateFlow({ catalog, start, go }: { catalog: Catalog, start?: LabState, go: Go }) {
  const prefilled = Boolean(start && start !== 'create-details')
  const [initial] = useState(() => (prefilled ? swissCardDraft() : emptyDraft()))
  const [details, setDetails] = useState<Pick<Keepsake, 'name' | 'text' | 'photos'>>(() => ({ name: initial.name, text: initial.text, photos: initial.photos }))
  // The flow's options start as the example's (or none); Next checks them, nothing is written yet.
  const [source] = useState<OptionsSource>(() => ({ product: { options: initial.options, skus: [] }, saveOptions: () => [] }))
  const optionsDraft = useOptionsDraft(source)
  const [edits, setEdits] = useState<CreateRow[]>(() => (prefilled ? presetRows(initial) : []))
  const [index, setIndex] = useState(() => startStep(start))
  const [tried, setTried] = useState(false)
  const [picking, setPicking] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const options = optionsDraft.options
  const rows = createRows(options, edits)
  const steps = STEPS
  const step = steps[index]!
  const otherCodes = new Set(catalog.products.flatMap(p => p.skus.map(s => s.code.toUpperCase())))
  const problems = {
    details: !(details.name.en.trim() || details.name.de.trim()),
    options: optionsProblems(options, []),
    variants: createErrors(rows, otherCodes),
  }
  const variantsBlocked = problems.variants.none || Object.keys(problems.variants.rows).length > 0
  const stepBlocked = step === 'details' ? problems.details : step === 'options' ? problems.options.length > 0 : step === 'variants' ? variantsBlocked : false
  const isLast = index === steps.length - 1
  const touched = Boolean(details.name.en || details.name.de || options.length)
  const leave = () => (touched ? setLeaving(true) : go({ name: 'products' }))

  const setRow = (key: string, patch: Partial<CreateRow>) => setEdits((e) => {
    const base = e.find(r => r.key === key) ?? rows.find(r => r.key === key)!

    return [...e.filter(r => r.key !== key), { ...base, ...patch }]
  })
  const next = () => {
    if (stepBlocked) {
      setTried(true)

      return
    }
    setTried(false)
    if (!isLast) {
      setIndex(index + 1)

      return
    }
    const id = `p-new-${catalog.products.length + 1}`

    catalog.create(buildKeepsake({ ...initial, ...details, options }, rows, id))
    toast.success(`${label(details.name)} created as a draft with ${rows.filter(r => r.sold).length} ${rows.filter(r => r.sold).length === 1 ? 'variant' : 'variants'}.`)
    go({ name: 'product', id })
  }

  const optionsEditor = (
    <section aria-label="Options" className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Options</h2>
        <p className="text-sm text-pretty text-muted">What a guest chooses between, like colour and theme, in this order. None is fine: the keepsake is then one variant.</p>
      </div>
      {tried && problems.options.length > 0 && <Refusal text={problems.options.map(p => p.text).join(' ')} />}
      <OptionsEditor draft={optionsDraft} />
    </section>
  )

  return (
    // Laptops: a page in the shell (Keepsakes stays highlighted). Phones: full screen over the tab
    // bar, Back and Next pinned at the bottom. The back arrow asks before it discards what was entered.
    <div aria-label="New keepsake" className="flex flex-col bg-background max-lg:fixed max-lg:inset-0 max-lg:z-40 lg:min-h-dvh" role="region">
      <header className="flex shrink-0 flex-col border-b border-separator bg-surface px-2 lg:gap-3 lg:px-6 lg:pt-6 lg:pb-3">
        <div className="flex min-w-0 items-center gap-2 max-lg:h-16">
          <BackButton back={{ label: 'Back to Keepsakes', onPress: leave }} />
          <h1 className="min-w-0 truncate text-heading max-lg:hidden">New keepsake</h1>
          <p className="flex min-w-0 flex-1 flex-col leading-tight lg:hidden">
            <span className="truncate text-sm font-semibold">New keepsake</span>
            <span className="truncate text-xs text-muted">{`Step ${index + 1} of ${steps.length} · ${STEP_LABEL[step]}`}</span>
          </p>
        </div>
        <ol aria-label="Steps" className="flex min-w-0 items-center gap-1 overflow-x-auto max-lg:hidden">
          {steps.map((s, i) => (
            <li key={s} className="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm aria-[current=step]:bg-default aria-[current=step]:font-semibold" aria-current={i === index ? 'step' : undefined}>
              <span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${i < index ? 'bg-foreground text-background' : i === index ? 'bg-accent text-accent-foreground' : 'border border-separator text-muted'}`}>
                {i < index ? <CheckIcon aria-hidden size={12} /> : i + 1}
              </span>
              {STEP_LABEL[s]}
            </li>
          ))}
        </ol>
      </header>

      <main className="flex-1 max-lg:overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-4 lg:px-6 lg:py-8">
          {step === 'details' && (
            <>
              <section aria-label="Name and text" className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
                <h2 className="text-base font-semibold">Name and text</h2>
                <BasicsFields showErrors={tried} value={details} onChange={v => setDetails(d => ({ ...d, ...v }))} />
                {tried && problems.details && <p className="text-sm text-danger">Add a name in English or German to create the keepsake.</p>}
              </section>
              <section aria-label="Photos" className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
                <h2 className="text-base font-semibold">Photos</h2>
                <PhotoOrder photos={details.photos} onChange={photos => setDetails(d => ({ ...d, photos }))} />
                <Button className="self-start max-lg:h-11" size="sm" variant="secondary" onPress={() => setPicking(true)}>
                  <PlusIcon aria-hidden size={16} />
                  Add photo
                </Button>
              </section>
            </>
          )}
          {step === 'options' && optionsEditor}
          {step === 'variants' && (
            <VariantRows errors={tried ? problems.variants : null} options={options} rows={rows} onChange={setRow} />
          )}
          {step === 'stock' && (
            <section aria-label="Opening stock" className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold">Opening stock</h2>
                <p className="text-sm text-pretty text-muted">Units you have now, per ticked variant. At 0 guests see it sold out; the others stay for sale. Change it later in Inventory.</p>
              </div>
              <ul className="flex flex-col divide-y divide-separator">
                {rows.filter(r => r.sold).map((r) => {
                  const title = variantTitle(r.values, options)

                  return (
                    <li key={r.key} className="flex items-center gap-3 py-2.5">
                      <SkuThumb options={options} sku={{ id: r.key, code: r.code, price: r.price, status: 'published', values: r.values, onHand: r.onHand, held: 0 }} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{title}</span>
                        <span className="truncate font-mono text-xs text-muted">{r.code}</span>
                      </span>
                      <QuantityBox label={`Opening stock of ${title}`} max={9999} min={0} value={r.onHand} onChange={onHand => setRow(r.key, { onHand })} />
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </main>

      <footer className="flex shrink-0 items-center gap-2 border-t border-separator bg-surface px-3 py-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] lg:sticky lg:bottom-0 lg:px-6 lg:py-3">
        {index > 0 && (
          <Button className="max-lg:h-11 max-lg:flex-1" variant="tertiary" onPress={() => { setTried(false); setIndex(index - 1) }}>
            <BackIcon aria-hidden size={16} />
            Back
          </Button>
        )}
        {tried && stepBlocked && <p className="min-w-0 flex-1 truncate text-sm text-danger max-lg:hidden">Fix what is marked to go on.</p>}
        <Button className="max-lg:h-11 max-lg:flex-1 lg:ms-auto" onPress={next}>
          {isLast ? 'Create keepsake' : `Next: ${STEP_LABEL[steps[index + 1]!]}`}
          {!isLast && <ArrowRightIcon aria-hidden size={16} />}
        </Button>
      </footer>

      {picking && (
        <MediaInsertSheet
          only="image"
          onClose={() => setPicking(false)}
          onInsert={(node) => {
            const id = String(node.attrs?.mediaId)

            setDetails(d => (d.photos.includes(id) ? d : { ...d, photos: [...d.photos, id] }))
            setPicking(false)
          }}
        />
      )}
      <ConfirmDialog
        body="What you entered for this keepsake is not saved anywhere yet."
        cancelLabel="Keep editing"
        confirmLabel="Discard keepsake"
        isOpen={leaving}
        title="Discard this keepsake?"
        onCancel={() => setLeaving(false)}
        onConfirm={() => go({ name: 'products' })}
      />
    </div>
  )
}
