import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@heroui/react";
import { useState } from "react";

import { useBack } from "@/hooks/use-back";
import { useRequireSignIn } from "@/features/auth/hooks/use-require-sign-in";
import { ReviewView } from "@/features/checkout/components/review-view";
import { useReview } from "@/features/checkout/hooks/use-review";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// C06 Review and send request.
export const Route = createFileRoute("/_guest/cart_/review")({
  // The bottom bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: ReviewPage,
});

function ReviewPage() {
  const isLoading = useSimulatedLoading();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-6 pt-16">
        <Skeleton className="h-16 w-full rounded-3xl" />
        <Skeleton className="mt-3 h-6 w-1/4 rounded-lg" />
        <Skeleton className="h-4 w-2/3 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return <ReviewScreen />;
}

function ReviewScreen() {
  const navigate = useNavigate();
  const { view, send } = useReview();
  const { requireSignIn, signInSheet, signedIn } = useRequireSignIn();
  const [sent, setSent] = useState(false);
  const toCart = useBack(() => void navigate({ to: "/cart", replace: true }));

  // Sending empties the cart; stay blank until C07 opens.
  if (!view && sent) return null;
  // Nothing to review (empty cart, or Back after sending): the cart shows its empty state.
  if (!view) return <Navigate replace to="/cart" />;

  return (
    <>
      <ReviewView
        {...view}
        onBack={toCart}
        onEditCart={toCart}
        // A direct visit may be signed out: sign in first; the guest then sends with a second tap.
        onSend={() => {
          if (!signedIn) {
            requireSignIn();

            return;
          }
          const ids = send();

          if (!ids) return;
          setSent(true);
          void navigate({
            to: "/cart/sent",
            search: { orders: ids.join(",") },
            replace: true,
          });
        }}
      />
      {signInSheet}
    </>
  );
}
