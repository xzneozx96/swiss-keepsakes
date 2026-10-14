import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { ExploreIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

// Experiences: a later stage of the PRD (§7.5).
export const Route = createFileRoute("/_guest/experiences")({
  component: ExperiencesPage,
});

function ExperiencesPage() {
  const { t } = useLocale();

  return (
    <EmptyState
      action={{ label: t("placeholder.backHome"), to: "/" }}
      icon={ExploreIcon}
      message={t("placeholder.laterPhase")}
    />
  );
}
