import type { MerchantSection } from "@/components/layout/merchant-shell";

import { createFileRoute, notFound } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { MoreIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

const sections: MerchantSection[] = [
  "bookings",
  "products",
  "content",
  "requests",
  "settings",
];

// Dashboard sections from later phases (bookings, products, content, requests, settings).
export const Route = createFileRoute("/store/$section")({
  beforeLoad: ({ params }) => {
    if (!sections.includes(params.section as MerchantSection)) throw notFound();
  },
  component: SectionPage,
});

function SectionPage() {
  const { t } = useLocale();

  return (
    <EmptyState
      action={{ label: t("placeholder.backToday"), to: "/store" }}
      icon={MoreIcon}
      message={t("placeholder.laterPhase")}
    />
  );
}
