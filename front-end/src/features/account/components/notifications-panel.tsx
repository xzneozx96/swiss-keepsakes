import { Link } from "@tanstack/react-router";

import {
  RowIcon,
  SettingsGroup,
  itemClass,
  plainItemClass,
  rowClass,
} from "./settings-list";

import { ChevronRightIcon, EmailIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { useDemo } from "@/features/demo";
import { renderMail } from "@/features/notifications/components/render-mail";
import { formatOrderDateTime } from "@/features/orders/lib/format";

/**
 * Notifications (1.12s): where order updates go, and every email the prototype sent this
 * guest, newest first. Each email about an order opens that order.
 */
export function NotificationsPanel({
  guestId,
  email,
}: {
  guestId: string;
  email: string;
}) {
  const { t, intlLocale } = useLocale();
  const { state } = useDemo();
  const mails = state.data.mail
    .filter((m) => m.to === "guest" && m.guestId === guestId)
    .reverse();

  return (
    <>
      <SettingsGroup id="mail-where" title={t("account.mail.where")}>
        <li className={`${itemClass} flex items-center gap-3 px-4 py-3`}>
          <RowIcon icon={EmailIcon} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium break-all">{email}</span>
            <span className="text-sm text-muted">
              {t("account.profile.mail.hint")}
            </span>
          </span>
        </li>
      </SettingsGroup>

      <SettingsGroup id="mail-sent" title={t("account.profile.mail.title")}>
        {mails.length === 0 ? (
          <li className="px-4 py-4 text-sm text-muted">
            {t("account.profile.mail.none")}
          </li>
        ) : (
          mails.map((mail) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium" lang={mail.language}>
                    {renderMail(mail, state.data.pickupPlaces).subject}
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {formatOrderDateTime(mail.at, intlLocale)}
                  </span>
                </span>
                {mail.orderId && (
                  <ChevronRightIcon
                    aria-hidden
                    className="shrink-0 text-muted"
                    size={20}
                  />
                )}
              </>
            );

            return (
              <li key={mail.id} className={plainItemClass}>
                {mail.orderId ? (
                  <Link
                    className={rowClass}
                    params={{ orderId: mail.orderId }}
                    to="/account/orders/$orderId"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex min-h-16 items-center gap-3 px-4 py-3">
                    {body}
                  </div>
                )}
              </li>
            );
          })
        )}
      </SettingsGroup>
    </>
  );
}
