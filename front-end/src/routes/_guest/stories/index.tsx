import { createFileRoute } from "@tanstack/react-router";

import { StoriesPage } from "@/features/content/components/stories-page";

// C19 Stories.
export const Route = createFileRoute("/_guest/stories/")({
  component: StoriesPage,
});
