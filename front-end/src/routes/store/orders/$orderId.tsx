import type { Order } from "@/features/orders/types";

import { Skeleton } from "@heroui/react";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { OrdersIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { MerchantOrderDetail } from "@/features/merchant/order-detail/components/merchant-order-detail";
import { useMerchantOrderDetail } from "@/features/merchant/order-detail/hooks/use-merchant-order-detail";
import { useOrder } from "@/features/orders/hooks/use-orders";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// M04 Gift order detail (step 1.11). M03 rows link here with the lowercase order id.
export const Route = createFileRoute("/store/orders/$orderId")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();
  const order = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5 lg:gap-6">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="h-8 w-1/2 rounded-lg" />
        <Skeleton className="h-7 w-2/3 rounded-full" />
        <Skeleton className="h-52 rounded-3xl sm:h-28" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="hidden h-64 rounded-3xl lg:block" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        action={{
          label: t("merchantOrder.notFound.action"),
          to: "/store/orders",
        }}
        icon={OrdersIcon}
        message={t("merchantOrder.notFound.message")}
      />
    );
  }

  // Keyed by order so sheet state never carries over between orders.
  return <OrderDetailScreen key={order.id} order={order} />;
}

function OrderDetailScreen({ order }: { order: Order }) {
  const { view, actions } = useMerchantOrderDetail(order);

  return <MerchantOrderDetail actions={actions} order={order} view={view} />;
}
