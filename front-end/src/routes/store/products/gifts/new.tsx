import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { EditorSkeleton } from "@/features/merchant/products/components/editor-parts";
import { GiftEditor } from "@/features/merchant/products/components/gift-editor";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";
import {
  type GiftStep,
  GIFT_STEPS,
} from "@/features/merchant/products/lib/search-params";

// "Add gift" on M11 (owner, 15.10.2026): the M12 stepper with a blank draft, walked with
// Back and Next. It is stored at its first save and then opens at
// /store/products/gifts/$productId on the same step. A static segment, so it wins.
export const Route = createFileRoute("/store/products/gifts/new")({
  validateSearch: (search: Record<string, unknown>): { step?: GiftStep } => ({
    step: GIFT_STEPS.includes(search.step as GiftStep)
      ? (search.step as GiftStep)
      : undefined,
  }),
  component: NewGiftPage,
});

function NewGiftPage() {
  const isLoading = useSimulatedLoading();
  const { step = "basics" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return isLoading ? (
    <EditorSkeleton />
  ) : (
    <GiftEditor
      product={null}
      step={step}
      onStep={(next) =>
        void navigate({
          search: next === "basics" ? {} : { step: next },
          replace: true,
        })
      }
    />
  );
}
