import type { Guest } from "@/features/orders/types";

import { Button, Tabs } from "@heroui/react";

import { PaymentsPanel } from "./payments-panel";
import { ProfilePanel } from "./profile-panel";

import { useLocale } from "@/contexts/locale-context";
import { TourBookingList } from "@/features/tours/booking";
import { TransactionList } from "@/features/transactions/components/transaction-list";

export const accountTabs = [
  "orders",
  "bookings",
  "payments",
  "profile",
] as const;
export type AccountTab = (typeof accountTabs)[number];

const tabLabel = {
  orders: "account.tab.orders",
  bookings: "account.tab.bookings",
  payments: "account.tab.payments",
  profile: "account.tab.profile",
} as const;

/**
 * Account hub (1.12r): who is signed in, then four tabs, the same underline tabs as C15:
 * Orders (C14), Bookings (tours, Phase 2), Payments and Profile.
 */
export function AccountHub({
  guest,
  tab,
  onTabChange,
  onSignOut,
}: {
  guest: Guest;
  tab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onSignOut: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col pb-12">
      <header className="flex flex-col px-4 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <h1 className="sr-only">{t("account.title")}</h1>
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-foreground font-serif text-2xl text-background"
          >
            {guest.name.charAt(0)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate font-serif text-title">{guest.name}</p>
            <p className="truncate text-sm text-muted">{guest.email}</p>
            <Button
              className="mt-2 self-start"
              size="sm"
              variant="outline"
              onPress={onSignOut}
            >
              {t("account.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <Tabs
        className="mt-6 w-full"
        selectedKey={tab}
        variant="secondary"
        onSelectionChange={(key) => onTabChange(key as AccountTab)}
      >
        <Tabs.ListContainer className="sticky top-0 z-10 bg-background px-2 pt-[env(safe-area-inset-top,0px)]">
          <Tabs.List aria-label={t("account.tabs.label")} className="w-full">
            {accountTabs.map((id) => (
              <Tabs.Tab
                key={id}
                className="h-11 w-auto min-w-0 flex-auto px-1 text-sm whitespace-nowrap"
                id={id}
              >
                {t(tabLabel[id])}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel className="px-4 pt-6" id="orders">
          <TransactionList />
        </Tabs.Panel>
        <Tabs.Panel className="px-4 pt-6" id="bookings">
          <TourBookingList />
        </Tabs.Panel>
        <Tabs.Panel className="px-4 pt-6" id="payments">
          <PaymentsPanel />
        </Tabs.Panel>
        <Tabs.Panel className="px-4 pt-6" id="profile">
          <ProfilePanel guest={guest} />
        </Tabs.Panel>
      </Tabs>
    </div>
  );
}
