import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";

import { AppToasts } from "@/components/app-toasts";
import { EmptyState } from "@/components/empty-state";
import { InfoIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { PrototypeBar, useStorageFull } from "@/features/demo";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const storageFull = useStorageFull();
  const isCalendarLab = useRouterState({
    select: (state) => state.location.pathname === "/lab/calendar",
  });

  return (
    // The prototype bar takes its own height; each shell fills the rest of the screen.
    <div className="flex min-h-dvh flex-col">
      {!isCalendarLab && <PrototypeBar />}
      <Outlet />
      <AppToasts storageFull={storageFull} />
    </div>
  );
}

function NotFound() {
  const { t } = useLocale();

  return (
    <div className="px-4 py-12">
      <EmptyState
        action={{ label: t("placeholder.backHome"), to: "/" }}
        icon={InfoIcon}
        message={t("notFound.message")}
      />
    </div>
  );
}
