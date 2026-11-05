import type { StockList } from '@sk/api-contract'
import type { InventorySearch, StockTab } from '../lib/list'
import type { MessageKey } from '@/i18n/en'

import { useCallback } from 'react'

import { ListSearch, ListToolbar } from '@/components/layout/list-toolbar'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { serverPager } from '@/components/list-pagination'
import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { KeepsakeGate } from '@/features/keepsakes/components/keepsake-gate'
import { KeepsakeNotice } from '@/features/keepsakes/components/keepsake-notice'
import { useLastPageFallback } from '@/hooks/use-last-page-fallback'
import { useListLoading } from '@/hooks/use-list-loading'
import { useSearchBox } from '@/hooks/use-search-box'
import { useInventory } from '../api/queries'
import { FILTER_OF_TAB, INVENTORY_PAGE_SIZE, STOCK_TABS } from '../lib/list'
import { StockRows } from './inventory-rows'

const TAB_LABELS: Record<StockTab, MessageKey> = { all: 'inventory.tab.all', inStock: 'inventory.tab.inStock', soldOut: 'inventory.tab.soldOut' }
const EMPTY_TEXTS: Record<StockTab, MessageKey> = { all: 'inventory.empty.all', inStock: 'inventory.empty.inStock', soldOut: 'inventory.empty.soldOut' }

/** The tabs with the figures of the whole store (none while loading) and the search on the same row, then the table, as on the other list screens. */
function InventoryCard({ storeId, stock, isLoading, search, onSearch, failure }: {
  storeId: string
  stock?: StockList
  isLoading: boolean
  search: InventorySearch
  onSearch: (patch: Partial<InventorySearch>) => void
  failure?: React.ReactNode
}) {
  const { t } = useLocale()
  const tab = search.tab ?? 'all'
  const page = search.page ?? 1
  const query = search.q?.trim() ?? ''
  const commitSearch = useCallback((text: string) => onSearch({ q: text.trim() ? text : undefined, page: undefined }), [onSearch])
  const [text, setText] = useSearchBox(search.q ?? '', commitSearch)
  const goToPage = useCallback((next: number) => onSearch({ page: next > 1 ? next : undefined }), [onSearch])

  return (
    <section aria-label={t('inventory.title')} className="flex min-w-0 flex-col gap-4">
      <ListToolbar
        search={<ListSearch isDisabled={isLoading && !stock} label={t('inventory.searchLabel')} placeholder={t('inventory.search')} value={text} onChange={setText} />}
        tabs={(
          <PageTabs
            fill
            label={t('inventory.tabsLabel')}
            selected={tab}
            sticky={false}
            tabs={STOCK_TABS.map(id => ({ id, label: t(TAB_LABELS[id]), count: stock?.counts[id] ?? null }))}
            onSelect={id => onSearch({ tab: id === 'all' ? undefined : id, page: undefined })}
          />
        )}
      />
      {failure ?? <StockRows empty={query ? t('inventory.empty.search', { query }) : t(EMPTY_TEXTS[tab])} isLoading={isLoading} paging={serverPager({ page, pageSize: INVENTORY_PAGE_SIZE, total: stock?.total ?? 0, go: goToPage })} rows={stock?.items ?? []} storeId={storeId} />}
    </section>
  )
}

function InventoryTable({ storeId, search, onSearch }: { storeId: string, search: InventorySearch, onSearch: (patch: Partial<InventorySearch>) => void }) {
  const page = search.page ?? 1
  const list = useInventory(storeId, { filter: FILTER_OF_TAB[search.tab ?? 'all'], q: search.q?.trim() || undefined, page, pageSize: INVENTORY_PAGE_SIZE })
  // A new tab, search or page keeps the last rows on screen until the answer is late, then the skeleton takes over.
  const loading = useListLoading(list)
  const goToPage = useCallback((next: number) => onSearch({ page: next > 1 ? next : undefined }), [onSearch])

  useLastPageFallback(list.data && !list.isPlaceholderData ? { rows: list.data.items.length, total: list.data.total } : undefined, page, INVENTORY_PAGE_SIZE, goToPage)

  return (
    <InventoryCard
      failure={list.isError ? <KeepsakeNotice error={list.error} onRetry={() => void list.refetch()} /> : undefined}
      isLoading={loading}
      search={search}
      stock={list.data}
      storeId={storeId}
      onSearch={onSearch}
    />
  )
}

/** N13: the stock of every live variant of the store, edited in place, ten rows a page from the server. The tab, the search and the page are in the URL. The page is a header, the tabs with the search and the table, laid out as the other list screens. */
export function InventoryList({ search, onSearch }: { search: InventorySearch, onSearch: (patch: Partial<InventorySearch>) => void }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-4" data-testid="inventory-list">
      <MerchantPageHeader description={t('inventory.description')} title={t('inventory.title')} />
      <KeepsakeGate fallback={<InventoryCard isLoading search={search} storeId="" onSearch={onSearch} />}>
        {storeId => <InventoryTable search={search} storeId={storeId} onSearch={onSearch} />}
      </KeepsakeGate>
    </div>
  )
}
