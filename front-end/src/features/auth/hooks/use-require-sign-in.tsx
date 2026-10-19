import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";

import { useDemoSelector } from "@/features/demo";

declare module "@tanstack/history" {
  interface HistoryState {
    /** Sign-in opened over its own return screen: on success it steps back, not forward. */
    signInOverReturnTo?: boolean;
  }
}

/**
 * Gate for actions that need a signed-in guest (spec §1.4, AC01): sending a request,
 * booking a tour. `requireSignIn(onDone, returnTo)` runs `onDone` at once when the guest
 * is signed in; otherwise it opens the C05 sign-in screen, which comes back to `returnTo`
 * (default: the current screen) after sign-in.
 *
 *   const { requireSignIn } = useRequireSignIn();
 *   <Button onPress={() => requireSignIn(() => navigate({ to: "/cart/review" }), "/cart/review")} />
 *
 * `signInSheet` is always null since C05 became a screen (1.6r); callers can drop it.
 */
export function useRequireSignIn() {
  const signedIn = useDemoSelector((s) => s.data.signedInGuestId !== null);
  const navigate = useNavigate();
  const here = useRouterState({ select: (s) => s.location.href });

  const requireSignIn = useCallback(
    (onDone: () => void = () => {}, returnTo: string = here) => {
      if (signedIn) {
        onDone();

        return;
      }
      void navigate({
        to: "/sign-in",
        search: { returnTo },
        state: { signInOverReturnTo: returnTo === here },
      });
    },
    [signedIn, navigate, here],
  );

  return { signedIn, requireSignIn, signInSheet: null };
}
