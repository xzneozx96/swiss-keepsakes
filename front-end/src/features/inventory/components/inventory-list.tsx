import type { StockList } from '@sk/api-contract'
import type { StockTab } from '../lib/list'
import type { MessageKey } from '@/i18n/en'

import { useState } from 'react'

import { ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakeGate } from '@/features/keepsakes/components/keepsake-gate'
import { KeepsakeNotice } from '@/features/keepsakes/components/keepsake-notice'
import { useInventory } from '../api/queries'
import { filterStock, STOCK_TABS } from '../lib/list'
import { StockRows } from './inventory-rows'

const TAB_LABELS: Record<StockTab, MessageKey> = { all: 'inventory.tab.all', inStock: 'inventory.tab.inStock', soldOut: 'inventory.tab.soldOut' }
const EMPTY_TEXTS: Record<StockTab, MessageKey> = { all: 'inventory.empty.all', inStock: 'inventory.empty.inStock', soldOut: 'inventory.empty.soldOut' }

/** The tabs with the figures of the whole store (none while loading) and the search on the same row, then the table, as on the other list screens. */
function InventoryCard({ storeId, stock, isLoading, failure }: { storeId: string, stock?: StockList, isLoading: boolean, failure?: React.ReactNode }) {
  const { t } = useLocale()
  const [tab, setTab] = useState<StockTab>('all')
  const [query, setQuery] = useState('')
  const rows = filterStock(stock?.items ?? [], tab, query)

  return (
    <section aria-label={t('inventory.title')} className="flex min-w-0 flex-col gap-4">
      <ListToolbar
        search={<ListSearch isDisabled={isLoading} label={t('inventory.searchLabel')} placeholder={t('inventory.search')} value={query} onChange={setQuery} />}
        tabs={(
          <PageTabs
            fill
            label={t('inventory.tabsLabel')}
            selected={tab}
            sticky={false}
            tabs={STOCK_TABS.map(id => ({ id, label: t(TAB_LABELS[id]), count: stock?.counts[id] ?? null }))}
            onSelect={setTab}
          />
        )}
      />
      {failure ?? <StockRows empty={query.trim() ? t('inventory.empty.search', { query: query.trim() }) : t(EMPTY_TEXTS[tab])} isLoading={isLoading} resetKey={`${tab}\n${query}`} rows={rows} storeId={storeId} />}
    </section>
  )
}

function InventoryTable({ storeId }: { storeId: string }) {
  const list = useInventory(storeId)

  return (
    <InventoryCard
      failure={list.isError ? <KeepsakeNotice error={list.error} onRetry={() => void list.refetch()} /> : undefined}
      isLoading={list.isPending}
      stock={list.data}
      storeId={storeId}
    />
  )
}

/** N13: the stock of every live variant of the store, edited in place. The page is a header, the tabs with the search and the table, laid out as the other list screens. */
export function InventoryList() {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-4" data-testid="inventory-list">
      <MerchantPageHeader description={t('inventory.description')} title={t('inventory.title')} />
      <KeepsakeGate fallback={<InventoryCard isLoading storeId="" />}>
        {storeId => <InventoryTable storeId={storeId} />}
      </KeepsakeGate>
    </div>
  )
}
