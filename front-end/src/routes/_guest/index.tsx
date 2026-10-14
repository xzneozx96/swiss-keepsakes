import { createFileRoute } from "@tanstack/react-router";

import { DiscoveryHome } from "@/features/discovery/components/discovery-home";
import { useDiscoveryView } from "@/features/discovery/hooks/use-discovery-view";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

// C01 Discovery home: the platform's home page (spec §4.1, decision D6).
export const Route = createFileRoute("/_guest/")({ component: ExplorePage });

function ExplorePage() {
  const view = useDiscoveryView();
  const isLoading = useSimulatedLoading();

  return <DiscoveryHome isLoading={isLoading} view={view} />;
}
