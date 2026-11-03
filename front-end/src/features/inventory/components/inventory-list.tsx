import type { StockList } from '@sk/api-contract'
import type { StockTab } from '../lib/list'
import type { MessageKey } from '@/i18n/en'

import { SearchField } from '@heroui/react'
import { useState } from 'react'

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

/** The tabs with the figures of the whole store (none while loading) and the search on the same row, then the table. */
function InventoryCard({ storeId, stock, isLoading, failure }: { storeId: string, stock?: StockList, isLoading: boolean, failure?: React.ReactNode }) {
  const { t } = useLocale()
  const [tab, setTab] = useState<StockTab>('all')
  const [query, setQuery] = useState('')
  const rows = filterStock(stock?.items ?? [], tab, query)

  return (
    <section aria-label={t('inventory.title')} className="flex min-w-0 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <PageTabs
        split
        label={t('inventory.tabsLabel')}
        selected={tab}
        sticky={false}
        tabs={STOCK_TABS.map(id => ({ id, label: t(TAB_LABELS[id]), badge: stock?.counts[id] }))}
        trailing={(
          <SearchField aria-label={t('inventory.searchLabel')} className="w-full sm:w-64" isDisabled={isLoading} value={query} onChange={setQuery}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input className="w-full" placeholder={t('inventory.search')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
        onSelect={setTab}
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

/** N13: the stock of every live variant of the store, edited in place. The page is a header and one card with the tabs, the search and the table. */
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
