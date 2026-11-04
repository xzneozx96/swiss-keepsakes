import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { BackIcon, ProductsIcon } from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { StatusText } from '@/components/status-text'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { KeepsakeGate } from '@/features/keepsakes/components/keepsake-gate'
import { KeepsakeNotice } from '@/features/keepsakes/components/keepsake-notice'
import { nameIn } from '@/features/keepsakes/lib/keepsake-rules'
import { useInventoryItem } from '../api/queries'
import { AdjustStockSheet } from './adjust-stock-sheet'
import { DetailsCard, ItemSkeleton, ReservationsCard } from './inventory-item-cards'

const INVENTORY_PATH = '/store/products/inventory'

function ItemPage({ storeId, skuId }: { storeId: string, skuId: string }) {
  const { t, language } = useLocale()
  const query = useInventoryItem(storeId, skuId)
  const [adjusting, setAdjusting] = useState(false)
  const item = query.data

  if (query.isError) {
    if (query.error instanceof ApiProblem && (query.error.type === 'not-found' || query.error.status === 404))
      return <EmptyState action={{ label: t('inventory.item.back'), to: INVENTORY_PATH }} icon={ProductsIcon} message={t('inventory.item.notFound')} />

    return <KeepsakeNotice error={query.error} onRetry={() => void query.refetch()} />
  }
  if (!item)
    return <ItemSkeleton />

  const keepsake = nameIn(item.keepsakeName, language) || t('inventory.untitled')
  const variant = nameIn(item.variantTitle, language)
  const title = variant ? `${keepsake} · ${variant}` : keepsake
  const status = <StatusText tone={item.available === 0 ? 'danger' : 'success'}>{item.available === 0 ? t('inventory.soldOut') : t('inventory.available', { count: item.available })}</StatusText>

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="inventory-item">
      <MerchantBackBar
        label={t('inventory.item.back')}
        status={status}
        title={title}
        to={INVENTORY_PATH}
      />
      {/* On phones the ← bar shows the title and the status; the header stays for screen readers only. */}
      <header className="flex min-w-0 items-center gap-3 max-lg:sr-only">
        <Link aria-label={t('inventory.item.back')} className={`${buttonVariants({ isIconOnly: true, variant: 'tertiary' })} -ms-2 shrink-0`} to={INVENTORY_PATH}>
          <BackIcon aria-hidden size={20} />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="min-w-0 text-title text-pretty [overflow-wrap:anywhere]">{title}</h1>
          {status}
        </div>
      </header>
      <DetailsCard item={item} onAdjust={() => setAdjusting(true)} />
      <ReservationsCard item={item} />
      {adjusting && <AdjustStockSheet row={item} storeId={storeId} onClose={() => setAdjusting(false)} />}
    </div>
  )
}

/** The inventory item page of one variant: its stock, the open orders that reserve units, and Adjust stock in a sheet. */
export function InventoryItem({ skuId }: { skuId: string }) {
  return (
    <KeepsakeGate fallback={<ItemSkeleton />}>
      {storeId => <ItemPage skuId={skuId} storeId={storeId} />}
    </KeepsakeGate>
  )
}
