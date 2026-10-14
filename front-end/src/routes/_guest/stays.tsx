import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { ExploreIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

// Stays: a later stage of the PRD (§7.4).
export const Route = createFileRoute("/_guest/stays")({
  component: StaysPage,
});

function StaysPage() {
  const { t } = useLocale();

  return (
    <EmptyState
      action={{ label: t("placeholder.backHome"), to: "/" }}
      icon={ExploreIcon}
      message={t("placeholder.laterPhase")}
    />
  );
}
