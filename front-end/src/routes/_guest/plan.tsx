import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

import { AdviceChat } from "@/features/requests/components/advice-chat";

// C21 Trip assistant (R19): the floating button and the C01 banner open it (D1).
export const Route = createFileRoute("/_guest/plan")({
  // The composer is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: PlanPage,
});

function PlanPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();

  return (
    <AdviceChat
      onLeave={() =>
        canGoBack ? router.history.back() : void navigate({ to: "/" })
      }
    />
  );
}
