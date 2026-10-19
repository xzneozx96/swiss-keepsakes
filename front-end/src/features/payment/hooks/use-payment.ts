import type { Order } from '@sk/domain/orders'

import { amountDueNow } from '@sk/domain/orders'
import { formatMoney } from '@sk/domain/shared'

import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { shop } from '@/features/catalog/seed'
import {
  useBlockText,
  useOrderActions,
} from '@/features/orders/hooks/use-orders'
import { startOnlinePaymentBlock } from '@/features/orders/lib/transitions'

export type Outcome = 'succeeded' | 'failed' | 'processing'

/**
 * What the simulated provider shows: `choose` (the three outcomes), `failed` (after Fail, with
 * retry), `processing` (a payment is already open, so no second Pay) or `blocked` (nothing to pay).
 */
export type PaymentStep
  = | { kind: 'choose' }
    | { kind: 'failed' }
    | { kind: 'processing' }
    | { kind: 'blocked', reason: string }

export interface PaymentView {
  seller: string
  amount: string
  ref: string
  step: PaymentStep
  /** True from the first press until the screen changes, so a double tap never pays twice. */
  isPending: boolean
  choose: (outcome: Outcome) => void
  retry: () => void
  back: () => void
}

/** C12 simulated payment provider for one order, driven only by T0's guard and `payOnline`. */
export function usePayment(order: Order): PaymentView {
  const { intlLocale } = useLocale()
  const actions = useOrderActions()
  const blockText = useBlockText()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const [isPending, setIsPending] = useState(false)
  // A ref, not only state: a double tap fires both clicks before React re-renders.
  const pendingRef = useRef(false)
  // The amount at page open: after Pay the order moves on and amountDueNow changes.
  const [amount] = useState(() => amountDueNow(order))
  const block = startOnlinePaymentBlock(order)

  const toOrder = () =>
    void navigate({
      to: '/account/orders/$orderId',
      params: { orderId: order.id },
      replace: true,
    })

  const step: PaymentStep = failed
    ? { kind: 'failed' }
    : !block
        ? { kind: 'choose' }
        : block.code === 'payment-processing'
          ? { kind: 'processing' }
          : { kind: 'blocked', reason: blockText(block).text }

  return {
    seller: shop.name,
    amount: formatMoney(amount / 100, intlLocale),
    ref: order.ref,
    step,
    isPending,
    choose: (outcome) => {
      if (pendingRef.current)
        return
      const settle = () => {
        pendingRef.current = false
        setIsPending(false)
      }

      pendingRef.current = true
      setIsPending(true)
      if (actions.payOnline(order.id, outcome))
        return settle()
      if (outcome !== 'failed')
        return toOrder()
      setFailed(true)
      settle()
    },
    retry: () => setFailed(false),
    back: toOrder,
  }
}
