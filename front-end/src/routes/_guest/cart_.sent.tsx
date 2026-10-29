import { createFileRoute } from '@tanstack/react-router'

import { RequestSentSkeleton } from '@/components/layout/guest-skeletons'
import { RequestSent } from '@/features/checkout/components/request-sent'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { noIndexHead } from '@/lib/no-index'

/**
 * C07 Request sent. C06 opens it with `replace`; `?orders=` holds the new order ids,
 * comma-separated (e.g. "sk-1043,sk-1044").
 */
export const Route = createFileRoute('/_guest/cart_/sent')({
  ssr: false,
  head: noIndexHead,
  validateSearch: (search: Record<string, unknown>): { orders: string } => ({
    orders: typeof search.orders === 'string' ? search.orders : '',
  }),
  // The bottom bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: SentPage,
})

function SentPage() {
  const { orders } = Route.useSearch()
  const isLoading = useSimulatedLoading()

  if (isLoading)
    return <RequestSentSkeleton orders={Math.max(1, orders.split(',').filter(Boolean).length)} />

  return <RequestSent orderIds={orders.split(',').filter(Boolean)} />
}
