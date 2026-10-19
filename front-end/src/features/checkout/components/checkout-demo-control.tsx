import type { DemoState } from '@/features/demo/types'

import { Button } from '@heroui/react'

import { selectedCartLines, variantAvailable } from '@sk/domain/orders'
import { useDemoActions, useDemoSelector } from '@/features/demo'

/**
 * Lowers the on-hand stock of the first ticked cart gift's option to the units accepted orders
 * already hold, so nothing is left to request: C06 then shows "stock changed on send".
 */
function sellOutFirstCartItem(s: DemoState): DemoState {
  const line = selectedCartLines(s.data.cart)[0]

  if (!line)
    return s

  const free = variantAvailable(s.data, line.productId, line.variantId)

  return {
    ...s,
    data: {
      ...s.data,
      products: s.data.products.map(p =>
        p.id !== line.productId
          ? p
          : {
              ...p,
              variants: p.variants.map(v =>
                v.id === line.variantId ? { ...v, stock: v.stock - free } : v,
              ),
            },
      ),
    },
  }
}

/** Prototype-bar control (English, outside the product UI) for the C06 stock error. */
export function CheckoutDemoControl({ onDone }: { onDone: () => void }) {
  const { update } = useDemoActions()
  const demoCart = useDemoSelector(s => s.data.cart)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Review and send</p>
      <Button
        className="self-start"
        isDisabled={selectedCartLines(demoCart).length === 0}
        size="sm"
        variant="tertiary"
        onPress={() => {
          update(sellOutFirstCartItem)
          onDone()
        }}
      >
        Make an item sell out
      </Button>
      <p className="text-sm text-muted">
        Another guest&apos;s order takes the last units of the first ticked gift
        in the cart. Then send the request on the review screen. Reset restores
        the stock.
      </p>
    </div>
  )
}
