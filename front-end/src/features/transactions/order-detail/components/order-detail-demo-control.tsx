import { Button } from '@heroui/react'
import { useNavigate, useParams } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'

import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { useOrderActions } from '@/features/orders/hooks/use-orders'
import { cancelBlock } from '@/features/orders/lib/transitions'
import { addSampleOrders } from '../lib/sample-orders'

/**
 * Prototype-bar controls for C15 (English, outside the product UI): "Expire this order's
 * payment deadline" for the order on screen (outline §4, R05), and sample orders in every
 * C15 state until the request, merchant and payment steps can produce them.
 */
export function OrderDetailDemoControl({ onDone }: { onDone: () => void }) {
  const { state, update } = useDemo()
  const { language } = useLocale()
  const navigate = useNavigate()
  const actions = useOrderActions()
  const { orderId } = useParams({ strict: false })
  const order = state.data.orders.find(o => o.id === orderId)
  const canExpire = !!order && !cancelBlock(order, 'overdue')
  const signedIn = !!state.data.signedInGuestId

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Order detail</p>
      <div className="flex flex-wrap gap-2">
        <Button
          isDisabled={!canExpire}
          size="sm"
          variant="tertiary"
          onPress={() => {
            if (order)
              actions.expirePaymentDeadline(order.id)
            onDone()
          }}
        >
          Expire this order’s payment deadline
        </Button>
        <Button
          isDisabled={!signedIn}
          size="sm"
          variant="tertiary"
          onPress={() => {
            update(s =>
              addSampleOrders(s, demoNow(s.clockStartedAt), language),
            )
            onDone()
            void navigate({ to: '/account' })
          }}
        >
          Add sample orders in every state
        </Button>
      </div>
      <p className="text-sm text-muted">
        Expire works on an open order that is accepted and not paid yet
        {order ? ` (on screen: ${order.ref})` : ''}
        ; it is cancelled as overdue
        and its stock released. Sample orders (signed in only) add eight orders
        to My transactions, from awaiting confirmation to a payment received
        after cancellation. Reset removes them.
      </p>
    </div>
  )
}
