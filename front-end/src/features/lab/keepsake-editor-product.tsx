import type { Language, ProductOption, Sku } from './keepsake-editor-data'
import type { Go } from './keepsake-editor-nav'
import type { OptionsStart } from './keepsake-editor-options'
import type { Check, CheckTarget } from './keepsake-editor-rules'
import type { LabState } from './keepsake-editor-search-params'
import type { Catalog, ProductModel } from './keepsake-editor-state'
import type { DataTableColumn } from '@/components/data-table'
import type { RowAction } from '@/components/row-actions'

import { Button, Chip, toast } from '@heroui/react'
import { useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { DataTable } from '@/components/data-table'
import { ArchiveIcon, ContentIcon, EditIcon, GiftIcon, OptionIcon, PhotoAddIcon, PlusIcon, RestoreIcon, TrashIcon } from '@/components/icons'
import { PageTabs } from '@/components/page-tabs'
import { RowActions } from '@/components/row-actions'
import { CommissionCard } from '@/features/merchant/products/components/gift-editor'
import { useIsWide } from '@/hooks/use-is-wide'
import { OptionsSheet, Refusal } from './keepsake-editor-options'
import { BasicsFields, ChecksList, EditorTopBar, LanguageSwitch, PhonePublishBar, PhotoOrder, PublishActions, PublishHead, ReadCard, useLeaveGuard } from './keepsake-editor-parts'
import { PreviewFrame } from './keepsake-editor-preview'
import { blankSku, chf, deleteOptionRefusal, label, shortLabel, skuState, skusUsing, variantTitle } from './keepsake-editor-rules'
import { SkuSheet, SkuStatusChip, SkuThumb, StockLines } from './keepsake-editor-sku'
import { MediaInsertSheet } from './story-editor-sheets'

/**
 * The keepsake page (M12) on the story editor's flow (M17), owner 29 Oct 2026:
 *
 * - Edit: the cards edited in place, as M17's Write. Name and text (language switch), Media,
 *   Commission autosave (save status in the top bar). Options and Variants are flat tables; their
 *   add and edit actions open the sheets N14 and N15, with Save and Cancel, because they save whole.
 * - Review and publish: as M17's Review. The guest page in the phone preview on the left (a stand-in
 *   from the keepsake's data), the publish card on the right: language switch, what goes live,
 *   Publish or Unpublish, the checks (Edit and Show jump back to the field). Phones: the preview
 *   with its language switch, and M17's bar pinned at the bottom.
 */

type Screen = 'edit' | 'review'

type Sheet
  = | { kind: 'pick-photo' }
    | { kind: 'options', focus?: string, start?: OptionsStart }
    | { kind: 'sku', sku: Sku, tried?: boolean }
    | null

type Filter = 'all' | 'sale' | 'soldout' | 'hidden' | 'archived'
const FILTERS: { id: Filter, label: string, test: (s: Sku) => boolean }[] = [
  { id: 'all', label: 'All', test: s => s.status !== 'archived' },
  { id: 'sale', label: 'For sale', test: s => skuState(s).text === 'For sale' },
  { id: 'soldout', label: 'Sold out', test: s => skuState(s).text === 'Sold out' },
  { id: 'hidden', label: 'Hidden', test: s => s.status === 'draft' },
  { id: 'archived', label: 'Archived', test: s => s.status === 'archived' },
]

/** Which sheet a lab state opens on. */
function startSheet(start?: LabState): Sheet {
  switch (start) {
    case 'newoption':
      return { kind: 'options', start: 'addoption' }
    case 'inuse':
      return { kind: 'options', focus: 'opt-theme', start: 'inuse' }
    case 'duplicate':
      return { kind: 'sku', tried: true, sku: { ...blankSku('sku-try'), values: { 'opt-size': 'v-s', 'opt-theme': 'v-swan' }, code: 'VX-S-SWAN-2', price: 4900 } }
    default:
      return null
  }
}

/** A value of an option as plain text (no badge): "Small". */
function valueText(option: ProductOption, valueId: string | undefined) {
  const v = option.values.find(x => x.id === valueId)

  return v ? shortLabel(v.label) : '–'
}

// ---------------------------------------------------------------------------------------------
// Options: a flat table like the variants

function OptionsTable({ model, onEdit }: { model: ProductModel, onEdit: (optionId: string) => void }) {
  const isWide = useIsWide()
  const { confirm, dialog } = useConfirm()
  const [refusal, setRefusal] = useState<string | null>(null)
  const { options, skus } = model.product
  const used = (o: ProductOption) => {
    const n = skusUsing(skus, o.id).length

    return `${n} ${n === 1 ? 'variant' : 'variants'}`
  }
  /** The option's values as small chips, wrapping onto as many lines as needed (Medusa's options card). */
  const values = (o: ProductOption) => (
    <span className="flex flex-wrap gap-1.5">
      {o.values.map(v => (
        <Chip key={v.id} size="sm" variant="secondary">
          <Chip.Label>{shortLabel(v.label)}</Chip.Label>
        </Chip>
      ))}
    </span>
  )

  const remove = async (o: ProductOption) => {
    const refused = deleteOptionRefusal(skus, o.id)

    if (refused) {
      setRefusal(`Can’t delete ${label(o.name)}. ${refused}`)

      return
    }
    setRefusal(null)
    if (await confirm({ title: `Delete the option ${label(o.name)}?`, body: 'Its values go too. No variant uses them.', confirmLabel: 'Delete option' }))
      model.saveOptions(options.filter(x => x.id !== o.id), skus)
  }
  const menu = (o: ProductOption) => (
    <RowActions
      actions={[{ id: 'edit', label: 'Edit', icon: EditIcon }, { id: 'delete', label: 'Delete', icon: TrashIcon, isDanger: true }]}
      label={`Actions for ${label(o.name)}`}
      onAction={id => (id === 'edit' ? onEdit(o.id) : void remove(o))}
    />
  )
  const columns: DataTableColumn<ProductOption>[] = [
    {
      id: 'option',
      header: 'Option',
      isRowHeader: true,
      headerClassName: 'w-40',
      skeleton: 'two-line',
      render: o => (
        <span className="flex flex-col">
          <span className="text-sm font-medium">{o.name.en || '–'}</span>
          <span className="text-xs text-muted" lang="de">{o.name.de || 'No German name'}</span>
        </span>
      ),
    },
    { id: 'values', header: 'Values', cellClassName: 'whitespace-normal', render: values },
    { id: 'used', header: 'Used by', headerClassName: 'w-32', cellClassName: 'tabular-nums', render: used },
  ]

  return (
    <>
      {refusal && <Refusal text={refusal} />}
      {isWide
        ? (
            <DataTable
              columns={columns}
              contentClassName="min-w-[32rem] table-fixed"
              empty={{ icon: OptionIcon, message: 'No options: this keepsake is sold as one variant.' }}
              getRowId={o => o.id}
              label="Options"
              rowActions={{ render: menu }}
              rows={options}
              variant="card"
            />
          )
        : (
            // Medusa's options table on a phone: the name (DE under it) on the left, the values on
            // the right wrapping as far as they need (never cut), then "Used by" and ⋯.
            <ul aria-label="Options" className="flex flex-col divide-y divide-separator">
              {options.map(o => (
                <li key={o.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-start gap-x-3 py-3">
                  <span className="flex min-w-0 flex-col pt-0.5">
                    <span className="text-sm font-medium break-words">{o.name.en || '–'}</span>
                    <span className="text-xs break-words text-muted" lang="de">{o.name.de || 'No German name'}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-1 pt-0.5">
                    {values(o)}
                    <span className="text-xs text-muted">{`Used by ${used(o)}`}</span>
                  </span>
                  {menu(o)}
                </li>
              ))}
              {!options.length && <li className="py-4 text-sm text-muted">No options: this keepsake is sold as one variant.</li>}
            </ul>
          )}
      {dialog}
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Variants: the table, option columns as plain text

function VariantsTable({ model, onOpen }: { model: ProductModel, onOpen: (sku: Sku) => void }) {
  const isWide = useIsWide()
  const [filter, setFilter] = useState<Filter>('all')
  const [refusal, setRefusal] = useState<string | null>(null)
  const { options, skus, photos } = model.product
  const rows = skus.filter(FILTERS.find(f => f.id === filter)!.test)

  const actionsFor = (s: Sku): RowAction<'open' | 'toggle' | 'archive' | 'restore'>[] => s.status === 'archived'
    ? [{ id: 'restore', label: 'Restore as hidden', icon: RestoreIcon }]
    : [
        { id: 'open', label: 'Edit', icon: EditIcon },
        { id: 'toggle', label: s.status === 'published' ? 'Hide from guests' : 'Put on sale', icon: GiftIcon },
        { id: 'archive', label: 'Archive', icon: ArchiveIcon, isDanger: true },
      ]
  const act = (s: Sku, id: 'open' | 'toggle' | 'archive' | 'restore') => {
    setRefusal(null)
    if (id === 'open')
      return onOpen(s)
    const status = id === 'toggle' ? (s.status === 'published' ? 'draft' : 'published') : id === 'archive' ? 'archived' : 'draft'
    const refused = model.setSkuStatus(s.id, status)

    if (refused)
      setRefusal(`Can’t archive ${s.code}. ${refused}`)
    else toast(`${s.code}: ${status === 'published' ? 'for sale' : status === 'draft' ? 'hidden' : 'archived'}.`)
  }
  const menu = (s: Sku) => <RowActions actions={actionsFor(s)} label={`Actions for ${s.code}`} onAction={id => act(s, id)} />
  const columns: DataTableColumn<Sku>[] = [
    {
      id: 'variant',
      header: 'Variant',
      isRowHeader: true,
      skeleton: 'lead',
      render: s => (
        // `w-full`: a button is as wide as its content, so without it the code ran into the next column.
        <button className="flex w-full min-w-0 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onOpen(s)}>
          {/* Below 1280 the column is too narrow for the design photo and the code on one line. */}
          <span className="max-xl:hidden">
            <SkuThumb fallback={photos[0]} options={options} sku={s} />
          </span>
          <span className="min-w-0 font-mono text-sm break-all underline-offset-4 hover:underline">{s.code || 'No code'}</span>
        </button>
      ),
    },
    ...options.map(o => ({ id: o.id, header: label(o.name), headerClassName: 'w-24', cellClassName: 'text-sm', render: (s: Sku) => valueText(o, s.values[o.id]) })),
    { id: 'price', header: 'Price', headerClassName: 'w-24 text-end', cellClassName: 'text-end tabular-nums', render: s => (s.price ? chf(s.price) : '–') },
    {
      id: 'stock',
      header: 'Stock',
      headerClassName: 'w-32',
      skeleton: 'two-line',
      render: s => (
        <span className="flex flex-col items-start gap-0.5 text-sm">
          <StockLines sku={s} />
          {(s.status === 'draft' || s.status === 'archived') && <SkuStatusChip sku={s} />}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageTabs
        label="Show"
        selected={filter}
        sticky={false}
        tabs={FILTERS.map(f => ({ id: f.id, label: f.label, badge: skus.filter(f.test).length }))}
        onSelect={setFilter}
      />
      {refusal && <Refusal text={refusal} />}
      {isWide
        ? (
            <DataTable
              columns={columns}
              contentClassName="min-w-[36rem] table-fixed"
              empty={{ icon: GiftIcon, message: filter === 'all' ? 'No variants yet.' : 'No variants here.' }}
              getRowId={s => s.id}
              label={`Variants: ${FILTERS.find(f => f.id === filter)!.label}`}
              resetKey={filter}
              rowActions={{ render: menu }}
              rows={rows}
              variant="card"
            />
          )
        : (
            <ul className="flex flex-col divide-y divide-separator">
              {rows.map(s => (
                <li key={s.id} className="flex min-w-0 items-center gap-1 py-2">
                  {/* The name and its code, price and status on the left; the stock lines on the right. */}
                  <button className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => onOpen(s)}>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-pretty">{variantTitle(s.values, options)}</span>
                      <span className="text-xs text-pretty text-muted tabular-nums">
                        {[s.code || 'No code', s.price ? chf(s.price) : 'no price', s.status === 'draft' ? 'hidden' : s.status === 'archived' ? 'archived' : ''].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <StockLines className="items-end text-sm" sku={s} />
                  </button>
                  {menu(s)}
                </li>
              ))}
              {!rows.length && <li className="py-4 text-sm text-muted">No variants here.</li>}
            </ul>
          )}
      <p className="text-xs text-pretty text-muted">
        {options.length
          ? `Only these combinations are sold: ${skus.filter(s => s.status !== 'archived').length} of ${options.reduce((n, o) => n * o.values.length, 1)} possible. Stock is set in Inventory.`
          : 'With no options, the keepsake has exactly one variant.'}
      </p>
    </>
  )
}

// ---------------------------------------------------------------------------------------------
// Review and publish

function ReviewScreen({ model, language, onLanguage, onFix, blocked }: {
  model: ProductModel
  language: Language
  onLanguage: (l: Language) => void
  onFix: (check: Check) => void
  blocked: boolean
}) {
  const isWide = useIsWide()

  // Phones (owner): only the guest page's preview, with the language switch that drives it, and the
  // pinned bar with the checks and Publish. What goes live is in the checks; there is no Details tab.
  if (!isWide) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-3 pb-52">
        <div className="flex flex-col gap-1.5">
          <LanguageSwitch text={model.product} value={language} onChange={onLanguage} />
          <p className="text-xs text-muted">The preview follows the switch. Name and text are per language.</p>
        </div>
        <PreviewFrame language={language} product={model.product} />
        <PhonePublishBar model={model} startExpanded={blocked} onFix={onFix} />
      </div>
    )
  }

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_440px]">
      <section aria-label="Preview" className="sticky top-[5.0625rem] flex h-[calc(100dvh-5.0625rem)] flex-col items-center gap-3 self-start bg-default/50 px-6 py-5">
        <p className="text-sm text-muted">What guests will see on a phone, as most of them shop. Scroll inside the phone.</p>
        <PreviewFrame fixed language={language} product={model.product} />
      </section>
      <aside aria-label="Publish" className="sticky top-[5.0625rem] flex h-[calc(100dvh-5.0625rem)] flex-col gap-4 overflow-y-auto border-s border-separator bg-background p-5">
        <section className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
          <PublishHead language={language} model={model} onLanguage={onLanguage} />
          <PublishActions model={model} />
          <div className="border-t border-separator pt-4">
            <ChecksList model={model} onFix={onFix} />
          </div>
        </section>
        <p className="px-1 text-xs text-pretty text-muted">The preview is a stand-in built from this keepsake’s data. The guest page (C03) is designed in its own slice.</p>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// The page

export function ProductPage({ catalog, id, start, go }: { catalog: Catalog, id: string, start?: LabState, go: Go }) {
  const model = catalog.forProduct(id)
  const { product } = model
  const [screen, setScreen] = useState<Screen>(start === 'review' || start === 'blocked' ? 'review' : 'edit')
  const [language, setLanguage] = useState<Language>('en')
  const [attempted, setAttempted] = useState(start === 'blocked')
  const [sheet, setSheet] = useState<Sheet>(() => startSheet(start))
  const guard = useLeaveGuard(model, start === 'unsaved', () => go({ name: 'products' }))
  const close = () => setSheet(null)
  const openVariant = (sku: Sku) => go({ name: 'variant', skuId: sku.id })
  const show = (next: Screen) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }
  const fix = (check: Check) => {
    const target: CheckTarget = check.target

    if (check.id === 'language' || check.id === 'photo')
      setAttempted(true)
    show('edit')
    requestAnimationFrame(() => document.getElementById(`product-${target}`)?.scrollIntoView({ block: 'start' }))
  }
  const review = () => {
    if (model.checks.blocking.length)
      setAttempted(true)
    show('review')
  }

  return (
    <div className="flex min-w-0 flex-col">
      <EditorTopBar
        backLabel={screen === 'review' ? 'Back to editing' : 'Back to Keepsakes'}
        model={model}
        onBack={screen === 'review' ? () => show('edit') : guard.leave}
      >
        {screen === 'edit' && (
          <Button className="shrink-0 max-lg:h-11" onPress={review}>
            <span className="lg:hidden">Review</span>
            <span className="max-lg:hidden">Review and publish</span>
          </Button>
        )}
      </EditorTopBar>

      {screen === 'edit' && (
        <main className="mx-auto flex w-full max-w-[880px] flex-col gap-3 pt-3 pb-14 lg:gap-6 lg:px-5 lg:pt-8 lg:pb-12">
          <ReadCard icon={ContentIcon} id="product-basics" title="Name and text">
            <BasicsFields showErrors={attempted} value={product} onChange={v => model.patch({ name: v.name, text: v.text })} />
          </ReadCard>
          <ReadCard
            icon={PhotoAddIcon}
            id="product-photos"
            title="Media"
            trailing={(
              <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet({ kind: 'pick-photo' })}>
                <PlusIcon aria-hidden size={16} />
                Add photo
              </Button>
            )}
          >
            {product.photos.length
              ? <PhotoOrder photos={product.photos} onChange={photos => model.patch({ photos })} />
              : <p className={`text-sm ${attempted ? 'text-danger' : 'text-muted'}`}>No photos yet. Add one from the media library to publish; the first is the cover.</p>}
          </ReadCard>
          <ReadCard
            icon={OptionIcon}
            id="product-options"
            title="Options"
            trailing={(
              <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet({ kind: 'options', start: 'new' })}>
                <PlusIcon aria-hidden size={16} />
                Add option
              </Button>
            )}
          >
            <OptionsTable model={model} onEdit={focus => setSheet({ kind: 'options', focus })} />
          </ReadCard>
          <ReadCard
            icon={GiftIcon}
            id="product-variants"
            title="Variants"
            trailing={product.options.length > 0 && (
              <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={() => setSheet({ kind: 'sku', sku: blankSku(`sku-add-${product.skus.length + 1}`) })}>
                <PlusIcon aria-hidden size={16} />
                Create
              </Button>
            )}
          >
            <VariantsTable model={model} onOpen={openVariant} />
          </ReadCard>
          {/* The shipped commission card (gift editor), imported as is. */}
          <div className="scroll-mt-24 max-lg:px-4" id="product-commission">
            <CommissionCard value={product.commissionRate} onChange={commissionRate => model.patch({ commissionRate })} />
          </div>
        </main>
      )}

      {screen === 'review' && <ReviewScreen blocked={start === 'blocked'} language={language} model={model} onFix={fix} onLanguage={setLanguage} />}

      {sheet?.kind === 'pick-photo' && (
        <MediaInsertSheet
          only="image"
          onClose={close}
          onInsert={(node) => {
            const mediaId = String(node.attrs?.mediaId)

            if (!product.photos.includes(mediaId))
              model.patch({ photos: [...product.photos, mediaId] })
            close()
          }}
        />
      )}
      {sheet?.kind === 'options' && <OptionsSheet focus={sheet.focus} model={model} start={sheet.start} onClose={close} />}
      {sheet?.kind === 'sku' && (
        <SkuSheet
          model={model}
          otherCodes={catalog.codesOutside(product.id)}
          start={sheet.sku}
          tried={sheet.tried}
          onClose={close}
        />
      )}
      {guard.dialog}
    </div>
  )
}
