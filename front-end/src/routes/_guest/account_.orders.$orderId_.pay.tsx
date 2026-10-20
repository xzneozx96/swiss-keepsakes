import type { Order } from '@sk/domain/orders'

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
import {
  ProviderLoading,
  ProviderPage,
} from '@/features/payment/components/provider-page'
import { usePayment } from '@/features/payment/hooks/use-payment'
import { useOwnOrder } from '@/features/transactions/order-detail/hooks/use-order-detail'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// C12 Payment (step 1.14): the simulated provider C15's Pay opens. The trailing underscore after
// $orderId keeps it from nesting under C15, which has no <Outlet/>.
export const Route = createFileRoute('/_guest/account_/orders/$orderId_/pay')({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: PayPage,
})

function PayPage() {
  const { orderId } = Route.useParams()
  const { t } = useLocale()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const isLoading = useSimulatedLoading()
  const { requireSignIn, signInSheet } = useRequireSignIn()
  const order = useOwnOrder(orderId)

  if (isLoading)
    return <ProviderLoading />

  if (!order) {
    const back = () =>
      canGoBack ? router.history.back() : void navigate({ to: '/account' })

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

  // Keyed by order so the failed and pending state never carry over between orders.
  return <PayScreen key={order.id} order={order} />
}

function PayScreen({ order }: { order: Order }) {
  const view = usePayment(order)

  return <ProviderPage view={view} />
}
