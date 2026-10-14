import { createFileRoute } from "@tanstack/react-router";

import { useLocale } from "@/contexts/locale-context";
import {
  AccountHub,
  type AccountTab,
  accountTabs,
} from "@/features/account/components/account-hub";
import { SignInPrompt } from "@/features/auth/components/account-profile";
import { useRequireSignIn } from "@/features/auth/hooks/use-require-sign-in";
import { useDemo } from "@/features/demo";

// Account tab: signed-out prompt opens C05 (step 1.6); signed in, the account hub (1.12r) with
// C14 orders, bookings, payments and profile. `tab` is optional so every existing link opens Orders.
export const Route = createFileRoute("/_guest/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: AccountTab } =>
    accountTabs.includes(search.tab as AccountTab)
      ? { tab: search.tab as AccountTab }
      : {},
  component: AccountPage,
});

function AccountPage() {
  const { t } = useLocale();
  const { state, update } = useDemo();
  const { tab = "orders" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { requireSignIn } = useRequireSignIn();
  const guest = state.data.guests.find(
    (g) => g.id === state.data.signedInGuestId,
  );

  const signOut = () =>
    update((s) => ({ ...s, data: { ...s.data, signedInGuestId: null } }));

  if (guest) {
    return (
      <AccountHub
        guest={guest}
        tab={tab}
        onSignOut={signOut}
        onTabChange={(next) =>
          void navigate({
            search: next === "orders" ? {} : { tab: next },
            replace: true,
          })
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
      <h1 className="font-serif text-display">{t("auth.account.title")}</h1>
      {/* Opens the C05 screen (1.6r) at /sign-in?returnTo=/account. */}
      <SignInPrompt onSignIn={() => requireSignIn(undefined, "/account")} />
    </div>
  );
}
