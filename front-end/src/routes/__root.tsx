import { Outlet, createRootRoute } from "@tanstack/react-router";

import { AppToasts } from "@/components/app-toasts";
import { EmptyState } from "@/components/empty-state";
import { InfoIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { PrototypeBar } from "@/features/demo";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    // The prototype bar takes its own height; each shell fills the rest of the screen.
    <div className="flex min-h-dvh flex-col">
      <PrototypeBar />
      <Outlet />
      <AppToasts />
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
