import type { Product, ProductVariant } from '@sk/api-contract'
import type { Outcome } from '../hooks/use-keepsake-editor'
import type { DataTableColumn } from '@/components/data-table'

import { toast } from '@heroui/react'
import { useState } from 'react'

import { DataTable } from '@/components/data-table'
import { EditIcon, OptionIcon, StatusNeutralIcon, StatusSuccessIcon } from '@/components/icons'
import { PageTabs } from '@/components/page-tabs'
import { RowActions } from '@/components/row-actions'
import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'
import { chf } from '../lib/keepsake-rules'
import { problemMessageKey } from '../lib/problems'
import { KeepsakeCard } from './keepsake-card'
import { VariantSheet } from './variant-sheet'

// E6.2 adds Sold out (with E6.3's stock) and Archived to this list.
const TABS = ['all', 'for-sale', 'hidden'] as const

type Tab = (typeof TABS)[number]
type Action = 'edit' | 'toggle'
type Save = (variantId: string, body: { skuCode?: string, priceRappen?: number, status?: 'published' | 'draft' }) => Promise<Outcome>

const inTab = (variant: ProductVariant, tab: Tab) => tab === 'all' || (tab === 'for-sale' ? variant.status === 'published' : variant.status === 'draft')

/**
 * The Variants card: a keepsake with no options has one variant, which a merchant can edit, hide or put on sale. E6.2 turns
 * this into the combinations table N15 with option columns and Create variant, and the variant page; E6.3 shows stock
 * on two lines.
 */
export function VariantsCard({ keepsake, onSave }: { keepsake: Product, onSave: Save }) {
  const { t, intlLocale } = useLocale()
  const [tab, setTab] = useState<Tab>('all')
  const [editing, setEditing] = useState<ProductVariant>()
  const rows = keepsake.variants.filter(variant => inTab(variant, tab))
  const count = (which: Tab) => keepsake.variants.filter(variant => inTab(variant, which)).length

  const toggle = async (variant: ProductVariant) => {
    const status = variant.status === 'published' ? 'draft' : 'published'
    const outcome = await onSave(variant.id, { status })

    if (outcome.ok)
      toast.success(t(status === 'draft' ? 'keepsakes.variant.toast.hidden' : 'keepsakes.variant.toast.forSale', { code: variant.skuCode }))
    else
      toast.danger(t(problemMessageKey(outcome.type)))
  }

  const menu = (variant: ProductVariant) => (
    <RowActions<Action>
      actions={[
        { id: 'edit', label: t('keepsakes.variant.edit'), icon: EditIcon },
        variant.status === 'published'
          ? { id: 'toggle', label: t('keepsakes.variant.hide'), icon: StatusNeutralIcon }
          : { id: 'toggle', label: t('keepsakes.variant.putOnSale'), icon: StatusSuccessIcon },
      ]}
      label={t('keepsakes.variant.actions', { code: variant.skuCode })}
      onAction={(action) => {
        if (action === 'edit')
          setEditing(variant)
        else
          void toggle(variant)
      }}
    />
  )

  const status = (variant: ProductVariant) => (
    <StatusChip tone={variant.status === 'published' ? 'success' : 'neutral'}>
      {t(variant.status === 'published' ? 'keepsakes.variant.status.published' : 'keepsakes.variant.status.hidden')}
    </StatusChip>
  )

  const columns: DataTableColumn<ProductVariant>[] = [
    { id: 'code', header: t('keepsakes.variants.column.variant'), isRowHeader: true, render: variant => <span className="font-mono text-sm">{variant.skuCode}</span> },
    { id: 'price', header: t('keepsakes.variants.column.price'), headerClassName: 'text-end', cellClassName: 'text-end tabular-nums', render: variant => chf(variant.priceRappen, intlLocale) },
    { id: 'status', header: t('keepsakes.variants.column.status'), skeleton: 'chip', render: status },
  ]

  return (
    <KeepsakeCard icon={OptionIcon} id="variants" title={t('keepsakes.variants.title')}>
      <PageTabs
        fill
        label={t('keepsakes.variants.tabs')}
        selected={tab}
        sticky={false}
        tabs={TABS.map(id => ({ id, label: t(`keepsakes.variants.tab.${id}`), badge: count(id) }))}
        onSelect={setTab}
      />
      <DataTable
        cards={pageRows => (
          <ul className="flex flex-col gap-2 lg:hidden">
            {pageRows.map(variant => (
              <li key={variant.id} className="flex items-center gap-2 border-t border-separator pt-2 first:border-none first:pt-0">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-sm">{variant.skuCode}</span>
                  <span className="text-label text-muted tabular-nums">{chf(variant.priceRappen, intlLocale)}</span>
                </span>
                {status(variant)}
                {menu(variant)}
              </li>
            ))}
          </ul>
        )}
        columns={columns}
        empty={{ icon: OptionIcon, message: t(tab === 'all' ? 'keepsakes.variants.none' : 'keepsakes.variants.noneHere') }}
        getRowId={variant => variant.id}
        hidePager
        label={t('keepsakes.variants.title')}
        resetKey={tab}
        rowActions={{ render: menu }}
        rows={rows}
        variant="card"
      />
      <p className="text-xs text-pretty text-muted">{t('keepsakes.variants.footnote')}</p>
      {editing && <VariantSheet variant={editing} onClose={() => setEditing(undefined)} onSave={onSave} />}
    </KeepsakeCard>
  )
}
