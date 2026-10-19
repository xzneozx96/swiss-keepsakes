import type { OrderTabId } from '@/features/merchant/orders/lib/order-tabs'

import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { MerchantOrders } from '@/features/merchant/orders/components/merchant-orders'
import { useMerchantOrders } from '@/features/merchant/orders/hooks/use-merchant-orders'
import {
  DEFAULT_ORDER_TAB,
  isOrderTab,
} from '@/features/merchant/orders/lib/order-tabs'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

interface OrdersSearch {
  /** Selected status tab; M02 task cards link here with it. Absent = awaiting confirmation. */
  status?: OrderTabId
}

// M03 Gift orders. M04 order detail is /store/orders/$orderId (step 1.11).
export const Route = createFileRoute('/store/orders/')({
  validateSearch: (search: Record<string, unknown>): OrdersSearch =>
    // An explicit undefined drops an unknown value; the raw search would otherwise pass through.
    ({ status: isOrderTab(search.status) ? search.status : undefined }),
  component: OrdersPage,
})

function OrdersPage() {
  const { t } = useLocale()
  const { status = DEFAULT_ORDER_TAB } = Route.useSearch()
  const navigate = useNavigate({ from: '/store/orders/' })
  const { tabs, rows } = useMerchantOrders(status)
  const isLoading = useSimulatedLoading()
  const selectedLabel = tabs.find(tab => tab.id === status)?.label ?? ''

  return (
    <MerchantOrders
      columns={{
        order: t('merchantOrders.column.order'),
        gifts: t('merchantOrders.column.gifts'),
        status: t('merchantOrders.column.status'),
        pickup: t('merchantOrders.column.pickup'),
      }}
      empty={{
        message: t('merchantOrders.empty', { tab: selectedLabel }),
        actionLabel: t('merchantOrders.empty.action'),
      }}
      intro={t('merchantOrders.intro')}
      isLoading={isLoading}
      rows={rows}
      selected={status}
      tabs={tabs}
      tabsLabel={t('merchantOrders.tabsLabel')}
      title={t('merchantOrders.title')}
      onSelect={id =>
        void navigate({
          search: id === DEFAULT_ORDER_TAB ? {} : { status: id },
          replace: true,
        })}
    />
  )
}
