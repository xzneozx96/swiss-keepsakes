import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";

import { EmptyState } from "@/components/empty-state";
import { CartIcon } from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { useLocale } from "@/contexts/locale-context";
import { useRequireSignIn } from "@/features/auth/hooks/use-require-sign-in";
import { CartView } from "@/features/cart/components/cart-view";
import { useCartView } from "@/features/cart/hooks/use-cart-view";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// C04 Cart.
export const Route = createFileRoute("/_guest/cart")({
  // The cart's bar is sticky in its own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: CartPage,
});

function CartPage() {
  const isLoading = useSimulatedLoading();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-6 pt-16">
        <Skeleton className="h-4 w-1/3 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="mt-2 h-6 w-1/4 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return <CartScreen />;
}

function CartScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const view = useCartView();
  const { requireSignIn, signInSheet } = useRequireSignIn();
  const back = () =>
    canGoBack ? router.history.back() : void navigate({ to: "/" });

  if (!view) {
    return (
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-2 px-4 pt-[env(safe-area-inset-top,0px)]">
          <BackButton label={t("cart.back")} onPress={back} />
          <h1
            data-cart-title
            className="font-serif text-title outline-none"
            tabIndex={-1}
          >
            {t("cart.title")}
          </h1>
        </header>
        <div className="pt-16">
          <EmptyState
            action={{ label: t("cart.empty.action"), to: "/gifts" }}
            icon={CartIcon}
            message={t("cart.empty.message")}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <CartView
        {...view}
        onBack={back}
        // Sign in (C05) when signed out, then review (C06); the cart is not touched.
        onContinue={() =>
          requireSignIn(
            () => void navigate({ to: "/cart/review" }),
            "/cart/review",
          )
        }
      />
      {signInSheet}
    </>
  );
}
