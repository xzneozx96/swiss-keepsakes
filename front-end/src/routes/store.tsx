import { Outlet, createFileRoute } from "@tanstack/react-router";

import { MerchantShell } from "@/components/layout/merchant-shell";

export const Route = createFileRoute("/store")({ component: StoreLayout });

function StoreLayout() {
  return (
    <MerchantShell>
      <Outlet />
    </MerchantShell>
  );
}
