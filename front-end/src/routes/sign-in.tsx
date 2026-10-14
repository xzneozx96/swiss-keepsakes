import { createFileRoute } from "@tanstack/react-router";

import { SignInScreen } from "@/features/auth/components/sign-in-screen";
import { safeReturnTo } from "@/features/auth/lib/return-to";

// C05 Sign in (1.6r): a full screen outside the guest shell so it can take two columns from 1024px.
// `returnTo` is where the guest lands after sign-in (default: Account).
export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): { returnTo?: string } =>
    typeof search.returnTo === "string" ? { returnTo: search.returnTo } : {},
  component: SignInPage,
});

function SignInPage() {
  const { returnTo } = Route.useSearch();

  return <SignInScreen returnTo={safeReturnTo(returnTo)} />;
}
