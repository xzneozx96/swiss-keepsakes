import { createFileRoute } from "@tanstack/react-router";

import { SalesOverview } from "@/features/merchant/sales/components/sales-overview";
import { OverviewFrame } from "@/features/merchant/today/components/overview-pages";

// M02 Overview › Sales: how sales are going in a period, for Owner and Manager alike (the old
// Overview analytics, owner review 15.10.2026).
export const Route = createFileRoute("/store/sales")({ component: SalesPage });

function SalesPage() {
  return (
    <OverviewFrame page="sales">
      <SalesOverview />
    </OverviewFrame>
  );
}
