import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import { CartIcon } from '@/components/icons'
import { BackButton } from '@/components/layout/cart-button'
import { CartSkeleton } from '@/components/layout/guest-skeletons'
import { useLocale } from '@/contexts/locale-context'
import { useRequireSignIn } from '@/features/auth/hooks/use-require-sign-in'
import { CartView } from '@/features/cart/components/cart-view'
import { useCartView } from '@/features/cart/hooks/use-cart-view'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'
import { noIndexHead } from '@/lib/no-index'

// C04 Cart.
export const Route = createFileRoute('/_guest/cart')({
  ssr: false,
  head: noIndexHead,
  // The cart's bar is sticky in its own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: CartPage,
})

function CartPage() {
  const isLoading = useSimulatedLoading()

  if (isLoading)
    return <CartSkeleton />

  return <CartScreen />
}

function CartScreen() {
  const { language, t } = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const view = useCartView()
  const { requireSignIn, signInSheet } = useRequireSignIn()
  const back = () =>
    canGoBack ? router.history.back() : void navigate({ to: '/$lang', params: { lang: language } })

  if (!view) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
          <BackButton label={t('cart.back')} onPress={back} />
          <h1
            data-cart-title
            className="font-serif text-title outline-none"
            tabIndex={-1}
          >
            {t('cart.title')}
          </h1>
        </header>
        <div className="pt-16">
          <EmptyState
            action={{ label: t('cart.empty.action'), to: '/$lang/gifts', params: { lang: language } }}
            icon={CartIcon}
            message={t('cart.empty.message')}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <CartView
        {...view}
        onBack={back}
        // Sign in (C05) when signed out, then review (C06); the cart is not touched.
        onContinue={() =>
          requireSignIn(
            () => void navigate({ to: '/cart/review' }),
            '/cart/review',
          )}
      />
      {signInSheet}
    </>
  )
}
