import { Skeleton } from '@heroui/react'
import { createFileRoute } from '@tanstack/react-router'

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

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-6 pt-16">
        <Skeleton className="size-14 rounded-full" />
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="mt-6 h-6 w-1/3 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    )
  }

  return <RequestSent orderIds={orders.split(',').filter(Boolean)} />
}
