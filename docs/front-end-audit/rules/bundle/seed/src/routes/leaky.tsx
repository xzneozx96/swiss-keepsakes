// bundle-dynamic-imports: validateSearch stays in the main bundle and reads a constant from a
// component module, and the side-effect CSS import is never split.
import { createFileRoute } from "@tanstack/react-router";

import "fakelib/dist/fakelib.css";

import { THING_TABS, Thing } from "@/features/x/components/thing";

export const Route = createFileRoute("/leaky")({
  validateSearch: (search: Record<string, unknown>) =>
    THING_TABS.includes(search.tab as string) ? { tab: search.tab } : {},
  component: Page,
});

function Page() {
  return <Thing />;
}
