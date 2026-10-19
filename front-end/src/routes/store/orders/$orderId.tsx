import type { Order } from '@sk/domain/orders'

import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import { OrdersIcon } from '@/components/icons'
import { DetailSkeleton } from '@/components/layout/detail-skeletons'
import { useLocale } from '@/contexts/locale-context'
import { MerchantOrderDetail } from '@/features/merchant/order-detail/components/merchant-order-detail'
import { useMerchantOrderDetail } from '@/features/merchant/order-detail/hooks/use-merchant-order-detail'
import { useOrder } from '@/features/orders/hooks/use-orders'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// M04 Gift order detail (step 1.11). M03 rows link here with the lowercase order id.
export const Route = createFileRoute('/store/orders/$orderId')({
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { t } = useLocale()
  const isLoading = useSimulatedLoading()
  const order = useOrder(orderId)

  if (isLoading) {
    return <DetailSkeleton chips={2} facts={3} side={3} />
  }

  if (!order) {
    return (
      <EmptyState
        action={{
          label: t('merchantOrder.notFound.action'),
          to: '/store/orders',
        }}
        icon={OrdersIcon}
        message={t('merchantOrder.notFound.message')}
      />
    )
  }

  // Keyed by order so sheet state never carries over between orders.
  return <OrderDetailScreen key={order.id} order={order} />
}

function OrderDetailScreen({ order }: { order: Order }) {
  const { view, actions } = useMerchantOrderDetail(order)

  return <MerchantOrderDetail actions={actions} order={order} view={view} />
}
