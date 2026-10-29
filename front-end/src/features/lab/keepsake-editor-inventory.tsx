import type { Keepsake, Sku } from './keepsake-editor-data'
import type { Go } from './keepsake-editor-nav'
import type { LabState } from './keepsake-editor-search-params'
import type { Catalog } from './keepsake-editor-state'
import type { DataTableColumn } from '@/components/data-table'

import { SearchField, toast } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'
import { useState } from 'react'

import { DataTable } from '@/components/data-table'
import { EditIcon, GiftIcon, OrdersIcon, ProductsIcon } from '@/components/icons'

import { PageTabs } from '@/components/page-tabs'
import { QuantityBox, QuantityStepper } from '@/components/quantity-stepper'
import { RowActions } from '@/components/row-actions'
import { useIsWide } from '@/hooks/use-is-wide'
import { LAB_TODAY } from './keepsake-editor-data'
import { Fact, PageHeader, ReadCard, StatusText } from './keepsake-editor-parts'
import { available, isSoldOut, label, stockError, variantTitle } from './keepsake-editor-rules'
import { SkuThumb, StockLines } from './keepsake-editor-sku'
import { PickerFrame } from './story-editor-picker'

/** The highest on-hand figure a field takes (the old editor's limit). */
const MAX_STOCK = 9999

/**
 * Inventory (N13), Medusa's inventory reduced to what ADR-022 keeps: one stock figure per SKU, no
 * locations. The list has every live variant with held, on hand (quick edit) and available, a
 * sold-out filter and search; the item page has Details, Held by orders (Medusa's reservations)
 * and the associated variant. On hand never goes below held; the refusal names the units.
 */

interface Row {
  product: Keepsake
  sku: Sku
}

/** On hand, edited in place; saved when the field commits (blur, Enter or a step). */
function OnHandField({ catalog, sku, label: name, start, onSaved }: { catalog: Catalog, sku: Sku, label: string, start?: number, onSaved?: () => void }) {
  const [value, setValue] = useState(start ?? sku.onHand)
  const [error, setError] = useState(() => (start === undefined ? undefined : stockError(start, sku.held)))

  // The shared quantity box (the approved cart box); the refusal sits under it.
  return (
    <div className="flex flex-col items-start gap-1">
      <QuantityBox
        label={name}
        max={MAX_STOCK}
        min={0}
        value={value}
        onChange={(next) => {
          setValue(next)
          const refused = next === sku.onHand ? undefined : catalog.setStock(sku.id, next)

          setError(refused)
          if (!refused)
            onSaved?.()
        }}
      />
      {error && <p className="max-w-48 text-xs text-danger" role="alert">{error}</p>}
    </div>
  )
}

type StockFilter = 'all' | 'instock' | 'soldout'
const STOCK_FILTERS: { id: StockFilter, label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'instock', label: 'In stock' },
  { id: 'soldout', label: 'Sold out' },
]

export function InventoryList({ catalog, go }: { catalog: Catalog, go: Go }) {
  const isWide = useIsWide()
  const [query, setQuery] = useState('')
  const [stock, setStock] = useState<StockFilter>('all')
  const q = query.trim().toLowerCase()
  const all: Row[] = catalog.products.flatMap(product => product.skus.filter(s => s.status !== 'archived').map(sku => ({ product, sku })))
  const byStock = (r: Row, f: StockFilter) => f === 'all' || (f === 'soldout') === isSoldOut(r.sku)
  const rows = all
    .filter(r => byStock(r, stock))
    .filter(r => !q || r.sku.code.toLowerCase().includes(q) || variantTitle(r.sku.values, r.product.options).toLowerCase().includes(q) || label(r.product.name).toLowerCase().includes(q))
  const title = (r: Row) => variantTitle(r.sku.values, r.product.options)
  const emptyText = q ? `No variant matches “${query}”.` : stock === 'soldout' ? 'Nothing is sold out.' : 'No variants in stock.'
  const open = (r: Row) => go({ name: 'item', skuId: r.sku.id })
  const menu = (r: Row) => (
    <RowActions
      actions={[{ id: 'item', label: 'Open item', icon: OrdersIcon }, { id: 'variant', label: 'Open variant', icon: GiftIcon }]}
      label={`Actions for ${r.sku.code}`}
      onAction={id => (id === 'item' ? open(r) : go({ name: 'variant', skuId: r.sku.id }))}
    />
  )
  const columns: DataTableColumn<Row>[] = [
    {
      id: 'title',
      header: 'Variant',
      isRowHeader: true,
      skeleton: 'lead',
      // `w-full`: a button is as wide as its content, so without it the text ran into the next column.
      // The names wrap at words; below 1280 the SKU code moves here from its own column.
      render: r => (
        <button className="flex w-full min-w-0 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => open(r)}>
          <SkuThumb fallback={r.product.photos[0]} options={r.product.options} sku={r.sku} />
          <span className="flex min-w-0 flex-col break-words">
            <span className="text-sm font-medium underline-offset-4 hover:underline">{title(r)}</span>
            <span className="font-mono text-xs text-muted xl:hidden">{r.sku.code}</span>
            <span className="text-xs text-muted">{label(r.product.name)}</span>
          </span>
        </button>
      ),
    },
    // Widths are the content plus the cell's 16px padding each side: the longest code (VX-M-STEAMBOAT)
    // is 118px, the quantity box 160px, "Reserved" and "Sold out" about 56px.
    { id: 'code', header: 'SKU code', headerClassName: 'hidden w-38 xl:table-cell', cellClassName: 'hidden xl:table-cell', render: r => <span className="font-mono text-sm">{r.sku.code}</span> },
    { id: 'held', header: 'Reserved', headerClassName: 'w-24 text-end', cellClassName: 'text-end tabular-nums', render: r => r.sku.held },
    { id: 'onhand', header: 'In stock', headerClassName: 'w-48', render: r => <OnHandField key={`${r.sku.id}-${r.sku.onHand}`} catalog={catalog} label={`In stock for ${r.sku.code}`} sku={r.sku} /> },
    {
      id: 'available',
      header: 'Available',
      headerClassName: 'w-24 text-end',
      cellClassName: 'text-end tabular-nums',
      render: r => <span className={available(r.sku) === 0 ? 'font-semibold text-danger' : ''}>{available(r.sku) === 0 ? 'Sold out' : available(r.sku)}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-3 pb-6 lg:gap-5 lg:p-6">
      <PageHeader title="Inventory" />
      <section aria-label="Stock per variant" className="flex min-w-0 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface max-lg:mx-4 lg:p-5">
        <PageTabs
          split
          label="Stock"
          selected={stock}
          sticky={false}
          tabs={STOCK_FILTERS.map(f => ({ id: f.id, label: f.label, badge: all.filter(r => byStock(r, f.id)).length }))}
          trailing={(
            <SearchField aria-label="Search by code or name" className="w-full sm:w-64" value={query} onChange={setQuery}>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input className="w-full" placeholder="Search code or name" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          )}
          onSelect={setStock}
        />
        {isWide
          ? (
              <DataTable
                columns={columns}
                // The fixed columns take 480px (632px from 1280); the card's body is 665px at 1024.
                contentClassName="min-w-[40rem] table-fixed"
                empty={{ icon: OrdersIcon, message: emptyText }}
                getRowId={r => r.sku.id}
                label="Inventory"
                resetKey={`${q}-${stock}`}
                rowActions={{ render: menu }}
                rows={rows}
                variant="card"
              />
            )
          : (
              <ul className="flex flex-col divide-y divide-separator">
                {rows.map(r => (
                  <li key={r.sku.id} className="flex min-w-0 flex-col gap-2 py-3">
                    <div className="flex min-w-0 items-center gap-1">
                      <button className="flex min-h-12 min-w-0 flex-1 items-center gap-3 text-start outline-none focus-visible:focus-ring" type="button" onClick={() => open(r)}>
                        <SkuThumb fallback={r.product.photos[0]} options={r.product.options} sku={r.sku} />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">{title(r)}</span>
                          <span className="truncate font-mono text-xs text-muted">{r.sku.code}</span>
                        </span>
                      </button>
                      {menu(r)}
                    </div>
                    <div className="flex items-start justify-between gap-3 ps-14">
                      <StockLines className="pt-1.5 text-sm" sku={r.sku} />
                      <OnHandField key={`${r.sku.id}-${r.sku.onHand}`} catalog={catalog} label={`In stock for ${r.sku.code}`} sku={r.sku} />
                    </div>
                  </li>
                ))}
                {!rows.length && <li className="py-6 text-center text-sm text-muted">{emptyText}</li>}
              </ul>
            )}
      </section>
    </div>
  )
}

/** The inventory item: Details, Held by orders, Associated variant; Adjust stock in a sheet. */
export function InventoryItem({ catalog, skuId, start, from, go }: { catalog: Catalog, skuId: string, start?: LabState, from?: 'variant', go: Go }) {
  const found = catalog.findSku(skuId)
  // The lab's below-held state opens the adjust sheet with 1 typed while 2 are held.
  const [adjusting, setAdjusting] = useState(start === 'belowheld')
  const [value, setValue] = useState(start === 'belowheld' ? 1 : found?.sku.onHand ?? 0)
  const [tried, setTried] = useState(start === 'belowheld')

  if (!found)
    return <p className="p-6 text-sm text-muted">This variant no longer exists.</p>

  const { product, sku } = found
  const holds = catalog.holds.filter(h => h.skuId === sku.id)
  const title = variantTitle(sku.values, product.options)
  const error = tried ? stockError(value, sku.held) : undefined

  return (
    <div className="flex flex-col gap-3 pb-6 lg:gap-5 lg:p-6">
      <PageHeader back={from === 'variant' ? { label: `Back to the variant ${sku.code}`, onPress: () => go({ name: 'variant', skuId: sku.id }) } : { label: 'Back to Inventory', onPress: () => go({ name: 'inventory' }) }} status={<StatusText tone={available(sku) === 0 ? 'danger' : 'success'} text={available(sku) === 0 ? 'Sold out' : `${available(sku)} available`} />} title={`${sku.code} · ${title}`} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-5">
          <ReadCard
            actions={[{ id: 'adjust', label: 'Adjust stock', icon: EditIcon }]}
            icon={OrdersIcon}
            id="item-details"
            title="Details"
            onAction={() => {
              setValue(sku.onHand)
              setTried(false)
              setAdjusting(true)
            }}
          >
            <dl className="flex flex-col gap-3">
              <Fact name="SKU code">
                <span className="font-mono">{sku.code}</span>
              </Fact>
              <Fact name="In stock">
                <span className="tabular-nums">{sku.onHand}</span>
              </Fact>
              <Fact name="Reserved by orders">
                <span className="tabular-nums">{sku.held}</span>
              </Fact>
              <Fact name="Available">
                <span className={`font-semibold tabular-nums ${available(sku) === 0 ? 'text-danger' : ''}`}>{available(sku) === 0 ? '0, sold out' : available(sku)}</span>
              </Fact>
            </dl>
          </ReadCard>
          <ReadCard icon={OrdersIcon} id="item-holds" title="Reserved by orders">
            {holds.length
              ? (
                  <ul className="flex flex-col divide-y divide-separator">
                    {holds.map(h => (
                      <li key={`${h.orderRef}-${h.skuId}`} className="flex items-center gap-3 py-2.5 first:pt-0">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <button className="min-h-11 self-start font-mono text-sm font-medium underline underline-offset-4 lg:min-h-0" type="button" onClick={() => toast(`Order ${h.orderRef} (not wired in the lab).`)}>{h.orderRef}</button>
                          <span className="truncate text-xs text-muted">{`${h.guest} · accepted ${formatShortDate(h.createdAt, LAB_TODAY, 'en-CH')}`}</span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums">{`${h.quantity} reserved`}</span>
                      </li>
                    ))}
                    <li className="flex justify-between pt-2.5 text-sm font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{`${sku.held} reserved`}</span>
                    </li>
                  </ul>
                )
              : <p className="text-sm text-muted">Nothing is reserved. Units are reserved when an order is accepted, and released when it is handed over, cancelled or declined.</p>}
          </ReadCard>
        </div>
        <ReadCard icon={ProductsIcon} id="item-variant" title="Associated variant">
          <button className="flex min-h-14 items-center gap-3 rounded-2xl text-start outline-none focus-visible:focus-ring" type="button" onClick={() => go({ name: 'variant', skuId: sku.id })}>
            <SkuThumb fallback={product.photos[0]} options={product.options} sku={sku} />
            {/* The 280px column fits the variant but not the keepsake's name: it wraps at words. */}
            <span className="flex min-w-0 flex-col break-words">
              <span className="text-sm font-medium underline-offset-4 hover:underline">{title}</span>
              <span className="text-xs text-muted">{label(product.name)}</span>
            </span>
          </button>
        </ReadCard>
      </div>
      {adjusting && (
        <PickerFrame
          doneLabel="Save"
          title={`Adjust stock · ${sku.code}`}
          onClose={() => setAdjusting(false)}
          onDone={() => {
            setTried(true)
            if (catalog.setStock(sku.id, value))
              return
            toast.success(`${sku.code}: ${value} in stock.`)
            setAdjusting(false)
          }}
        >
          <QuantityStepper
            hint={`${sku.held} reserved by orders`}
            label="In stock"
            max={MAX_STOCK}
            min={0}
            value={value}
            onChange={setValue}
          />
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          {/* Available is its own line, not joined to the reserved hint (owner). */}
          <p className="text-sm text-pretty text-muted">{`${Math.max(0, value - sku.held)} would be available. At 0 guests see it sold out; the other variants stay for sale.`}</p>
        </PickerFrame>
      )}
    </div>
  )
}
