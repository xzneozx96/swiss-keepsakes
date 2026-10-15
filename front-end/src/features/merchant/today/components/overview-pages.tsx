import { Skeleton, Tabs } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { STICKY_TABS } from "@/components/layout/sticky-tabs";
import { MerchantPageHeader } from "@/components/layout/merchant-page-header";
import { useLocale } from "@/contexts/locale-context";

/** M02 Overview's two pages, each its own route (owner review 15.10.2026). */
export const OVERVIEW_PAGES = [
  { id: "today", to: "/store" },
  { id: "sales", to: "/store/sales" },
] as const;
export type OverviewPage = (typeof OVERVIEW_PAGES)[number]["id"];

/**
 * The Overview pages' frame: a hidden page title and, on phones, the Today | Sales tabs (from
 * 1024px the sidebar lists the pages under Overview).
 */
export function OverviewFrame({
  page,
  children,
}: {
  page: OverviewPage;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6">
      {/* From 1024px the sidebar lists the pages, so the title stays for screen readers only. */}
      <MerchantPageHeader
        className="lg:sr-only"
        description={t("merchantToday.intro")}
        title={t("merchantToday.title")}
      />
      <Tabs
        className="w-full"
        selectedKey={page}
        variant="secondary"
        onSelectionChange={(key) =>
          void navigate({
            to: OVERVIEW_PAGES.find((p) => p.id === key)?.to ?? "/store",
          })
        }
      >
        <Tabs.ListContainer className={`lg:hidden ${STICKY_TABS}`}>
          <Tabs.List aria-label={t("overviewPages.label")} className="w-full">
            {OVERVIEW_PAGES.map((p) => (
              <Tabs.Tab
                key={p.id}
                className="h-11 min-w-0 flex-1 px-1.5 whitespace-nowrap"
                id={p.id}
              >
                {t(`overviewPages.${p.id}`)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="px-0 pt-2 pb-0 lg:pt-0" id={page}>
          {children}
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}

/** Loading: the widget frame (title and note in the tinted shell, a white card inside). */
export function WidgetSkeleton({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden
      className={`flex flex-col rounded-3xl bg-surface-secondary p-1.5 ${className}`}
    >
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3">
        {/* One shade darker: the plain skeleton grey is the shell's own. */}
        <Skeleton className="h-4 w-32 rounded-lg bg-default-hover" />
        <Skeleton className="h-3 w-48 rounded-lg bg-default-hover" />
      </div>
      <div className="flex flex-1 flex-col rounded-[1.25rem] bg-surface p-4 shadow-surface">
        {children}
      </div>
    </div>
  );
}
