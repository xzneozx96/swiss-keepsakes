import type { Go } from './keepsake-editor-nav'
import type { Catalog } from './keepsake-editor-state'

import { Button, toast } from '@heroui/react'
import { useState } from 'react'

import { ArchiveIcon, EditIcon, GiftIcon, OrdersIcon, PhotoAddIcon, RestoreIcon } from '@/components/icons'
import { THEME_PHOTO } from './keepsake-editor-data'
import { Refusal } from './keepsake-editor-options'
import { Fact, PageHeader, ReadCard, StatusText } from './keepsake-editor-parts'
import { available, chf, label, skuState, variantTitle } from './keepsake-editor-rules'
import { SkuSheet, ValueBadge } from './keepsake-editor-sku'
import { PhotoById } from './story-editor-sheets'

/**
 * The variant page (Medusa's variant detail): Details (option values, code, price, status) with ⋯
 * to edit in the variant sheet, Stock (on hand, held, available) linking to its inventory item,
 * and Media, the design's photo. The back arrow goes to the keepsake.
 */
export function VariantPage({ catalog, skuId, go }: { catalog: Catalog, skuId: string, go: Go }) {
  const found = catalog.findSku(skuId)
  const [editing, setEditing] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)

  if (!found)
    return <p className="p-6 text-sm text-muted">This variant no longer exists.</p>

  const { product, sku } = found
  const model = catalog.forProduct(product.id)
  const title = variantTitle(sku.values, product.options)
  const photo = THEME_PHOTO[sku.values['opt-theme'] ?? '']
  const status = (next: 'published' | 'draft' | 'archived') => {
    const refused = model.setSkuStatus(sku.id, next)

    setRefusal(refused ? `Can’t archive ${sku.code}. ${refused}` : null)
    if (!refused)
      toast(`${sku.code}: ${next === 'published' ? 'for sale' : next === 'draft' ? 'hidden' : 'archived'}.`)
  }

  return (
    <div className="flex flex-col gap-3 pb-6 lg:gap-5 lg:p-6">
      <PageHeader
        status={<StatusText {...skuState(sku)} />}
        back={{ label: `Back to ${label(product.name)}`, onPress: () => go({ name: 'product', id: product.id }) }}
        title={title}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-3 lg:gap-5">
          <ReadCard
            actions={sku.status === 'archived'
              ? [{ id: 'restore', label: 'Restore as hidden', icon: RestoreIcon }]
              : [
                  { id: 'edit', label: 'Edit', icon: EditIcon },
                  { id: 'toggle', label: sku.status === 'published' ? 'Hide from guests' : 'Put on sale', icon: GiftIcon },
                  { id: 'archive', label: 'Archive', icon: ArchiveIcon, isDanger: true },
                ]}
            icon={GiftIcon}
            id="variant-details"
            title="Details"
            onAction={id => (id === 'edit' ? setEditing(true) : status(id === 'toggle' ? (sku.status === 'published' ? 'draft' : 'published') : id === 'archive' ? 'archived' : 'draft'))}
          >
            {refusal && <Refusal text={refusal} />}
            <dl className="flex flex-col gap-3">
              {product.options.map(o => (
                <Fact key={o.id} name={label(o.name)}>
                  <ValueBadge option={o} valueId={sku.values[o.id]} />
                </Fact>
              ))}
              <Fact name="SKU code">
                <span className="font-mono">{sku.code}</span>
              </Fact>
              <Fact name="Price">
                <span className="tabular-nums">{chf(sku.price)}</span>
              </Fact>
            </dl>
          </ReadCard>
          <ReadCard icon={PhotoAddIcon} id="variant-media" title="Media">
            {photo
              ? (
                  <div className="flex items-center gap-3">
                    <PhotoById className="size-24 shrink-0 rounded-xl" mediaId={photo} />
                    <p className="text-sm text-pretty text-muted">The design of this theme. In this lab the photo comes from the theme; values have no photo of their own yet (open point).</p>
                  </div>
                )
              : <p className="text-sm text-muted">No photo of its own: guests see the keepsake’s photos.</p>}
          </ReadCard>
        </div>
        <ReadCard icon={OrdersIcon} id="variant-stock" title="Stock">
          <dl className="flex flex-col gap-3">
            <Fact name="In stock">
              <span className="tabular-nums">{sku.onHand}</span>
            </Fact>
            <Fact name="Reserved by orders">
              <span className="tabular-nums">{sku.held}</span>
            </Fact>
            <Fact name="Available">
              <span className={`tabular-nums ${available(sku) === 0 ? 'font-semibold text-danger' : 'font-semibold'}`}>{available(sku) === 0 ? '0, sold out' : available(sku)}</span>
            </Fact>
          </dl>
          <Button className="max-lg:h-11" variant="secondary" onPress={() => go({ name: 'item', skuId: sku.id, from: 'variant' })}>Open inventory item</Button>
        </ReadCard>
      </div>
      {editing && <SkuSheet model={model} otherCodes={catalog.codesOutside(product.id)} start={sku} onClose={() => setEditing(false)} />}
    </div>
  )
}
