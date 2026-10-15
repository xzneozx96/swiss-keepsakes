import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ReportPagesProvider } from "@/features/reports/hooks/use-report-pages";

// M21 Reports (owner review 15.10.2026): Money, Sales, Guests and Margin share one period and
// one set of filters. M24 cost data (/store/reports/costs) sits inside as well.
export const Route = createFileRoute("/store/reports")({
  component: () => (
    <ReportPagesProvider>
      <Outlet />
    </ReportPagesProvider>
  ),
});
