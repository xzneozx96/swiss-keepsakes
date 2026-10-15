import type { Guest } from "@/features/orders/types";

import { buttonVariants } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { useAccountHub } from "../hooks/use-account-hub";

import { GuestAvatar } from "./guest-avatar";
import {
  RowIcon,
  SectionRow,
  SettingsGroup,
  itemClass,
  rowClass,
} from "./settings-list";

import {
  LanguageIcon,
  LogoutIcon,
  NotificationIcon,
  OrdersIcon,
  PayLaterIcon,
  ProfileEditIcon,
  TourIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

/**
 * Account hub (1.12s, after Instagram "Settings and activity" and Meta Accounts Center): who
 * is signed in with Edit profile, then grouped rows that each drill into their own screen.
 * Every row carries one live line, so the hub shows what needs attention without a tap.
 */
export function AccountHub({
  guest,
  onSignOut,
}: {
  guest: Guest;
  onSignOut: () => void;
}) {
  const { t, language } = useLocale();
  const hub = useAccountHub(guest.id);

  return (
    <div className="flex flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top,0px)+24px)] pb-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <h1 className="sr-only">{t("account.title")}</h1>
        <GuestAvatar
          className="size-24 text-3xl shadow-surface ring-4 ring-surface"
          guest={guest}
        />
        <div className="flex w-full min-w-0 flex-col gap-0.5">
          <p className="font-serif text-title break-words">{guest.name}</p>
          <p className="text-sm break-all text-muted">{guest.email}</p>
        </div>
        <Link
          className={`${buttonVariants({ variant: "secondary", size: "sm" })} px-5`}
          search={{ tab: "edit" }}
          to="/account"
        >
          {t("account.editProfile")}
        </Link>
      </header>

      <SettingsGroup id="hub-activity" title={t("account.hub.activity")}>
        <SectionRow
          description={hub.orders}
          icon={OrdersIcon}
          section="orders"
          title={t("account.section.orders")}
          value={hub.orderCount || undefined}
        />
        <SectionRow
          description={hub.bookings}
          icon={TourIcon}
          section="bookings"
          title={t("account.section.bookings")}
          value={hub.bookingCount || undefined}
        />
      </SettingsGroup>

      <SettingsGroup id="hub-payments" title={t("account.section.payments")}>
        <SectionRow
          description={hub.payments}
          icon={PayLaterIcon}
          section="payments"
          title={t("account.hub.payments.title")}
          tone={hub.dueCount > 0 ? "accent" : "default"}
        />
      </SettingsGroup>

      <SettingsGroup id="hub-profile" title={t("account.hub.profile")}>
        <SectionRow
          description={t("account.hub.edit.description")}
          icon={ProfileEditIcon}
          section="edit"
          title={t("account.editProfile")}
        />
        <SectionRow
          description={t(`account.profile.language.${language}`)}
          icon={LanguageIcon}
          section="profile"
          title={t("account.section.profile")}
        />
        <SectionRow
          description={hub.mail.text}
          descriptionLang={hub.mail.lang}
          icon={NotificationIcon}
          section="notifications"
          title={t("account.section.notifications")}
        />
      </SettingsGroup>

      <SettingsGroup id="hub-session">
        <li className={itemClass}>
          <button
            className={`${rowClass} min-h-14 text-danger`}
            type="button"
            onClick={onSignOut}
          >
            <RowIcon icon={LogoutIcon} tone="danger" />
            <span className="flex-1 font-medium">{t("account.signOut")}</span>
          </button>
        </li>
      </SettingsGroup>
    </div>
  );
}
