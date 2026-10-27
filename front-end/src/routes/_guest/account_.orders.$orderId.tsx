import type { Order } from '@sk/domain/orders'

import type { OrderTab } from '@/features/transactions/order-detail/lib/search-params'
import { Skeleton } from '@heroui/react'

import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { EmptyState } from '@/components/empty-state'
import { OrdersIcon } from '@/components/icons'
import { BackButton } from '@/components/layout/cart-button'
import { useLocale } from '@/contexts/locale-context'
import { SignInPrompt } from '@/features/auth/components/account-profile'
import { useRequireSignIn } from '@/features/auth/hooks/use-require-sign-in'
import { useDemoSelector } from '@/features/demo'
import { OrderDetail } from '@/features/transactions/order-detail/components/order-detail'
import {
  useOrderDetail,
  useOwnOrder,
} from '@/features/transactions/order-detail/hooks/use-order-detail'
import {

  orderTabs,
} from '@/features/transactions/order-detail/lib/search-params'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { noIndexHead } from '@/lib/no-index'

// C15 Guest order detail (step 1.13). The trailing underscore keeps it out of account.tsx,
// which has no <Outlet/>; C14 rows link here. `tab` is optional so every existing link still opens
// on Overview.
export const Route = createFileRoute('/_guest/account_/orders/$orderId')({
  ssr: false,
  head: noIndexHead,
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  validateSearch: (search: Record<string, unknown>): { tab?: OrderTab } =>
    orderTabs.includes(search.tab as OrderTab)
      ? { tab: search.tab as OrderTab }
      : {},
  component: OrderDetailPage,
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  const { t } = useLocale()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const isLoading = useSimulatedLoading()
  const { requireSignIn, signInSheet } = useRequireSignIn()
  const order = useOwnOrder(orderId)

  const back = () =>
    canGoBack ? router.history.back() : void navigate({ to: '/account' })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-16">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="mt-2 h-9 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col gap-6 px-4">
        <header className="flex h-14 items-center pt-[env(safe-area-inset-top,0px)]">
          <BackButton label={t('guestOrder.back')} onPress={back} />
        </header>
        {signedInGuestId
          ? (
              <EmptyState
                action={{ label: t('guestOrder.notFound.action'), to: '/account' }}
                icon={OrdersIcon}
                message={t('guestOrder.notFound.message')}
              />
            )
          : (
              <SignInPrompt onSignIn={() => requireSignIn()} />
            )}
        {signInSheet}
      </div>
    )
  }

  // Keyed by order so the confirm dialog never carries over between orders.
  return <OrderDetailScreen key={order.id} order={order} onBack={back} />
}

function OrderDetailScreen({
  order,
  onBack,
}: {
  order: Order
  onBack: () => void
}) {
  const view = useOrderDetail(order)
  const { tab = 'overview' } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <OrderDetail
      tab={tab}
      view={view}
      onBack={onBack}
      onTabChange={next =>
        void navigate({
          search: next === 'overview' ? {} : { tab: next },
          replace: true,
          resetScroll: false,
        })}
    />
  )
}
