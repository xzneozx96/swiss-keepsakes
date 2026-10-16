import type { TourMaintenance } from "../types";

import { InfoIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { formatDate } from "@/lib/format";
import { pickText } from "@/lib/localized";
import { safeHref } from "@/lib/rich-text";

/**
 * The reason a tour cannot be booked right now (C09): the merchant's text in the guest's
 * language, an optional link to a notice page, and when the tour is expected back.
 */
export function MaintenanceNotice({
  maintenance,
}: {
  maintenance: TourMaintenance;
}) {
  const { t, language, intlLocale } = useLocale();
  const reason = pickText(maintenance.reason, language).text;
  const url = maintenance.url && safeHref(maintenance.url);

  return (
    <section
      aria-labelledby="tour-maintenance"
      className="flex flex-col gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground"
      role="status"
    >
      <h2
        className="flex items-center gap-2 font-semibold"
        id="tour-maintenance"
      >
        <InfoIcon aria-hidden className="shrink-0" size={18} />
        {t("tourDiscovery.maintenance.title")}
      </h2>
      <p className="text-pretty">
        {reason || t("tourDiscovery.maintenance.noReason")}
      </p>
      {maintenance.expectedBack && (
        <p className="font-medium">
          {t("tourDiscovery.maintenance.until", {
            date: formatDate(
              new Date(`${maintenance.expectedBack}T12:00:00Z`),
              intlLocale,
            ),
          })}
        </p>
      )}
      {url && (
        <a
          className="w-fit rounded-lg font-medium underline underline-offset-4 outline-none focus-visible:focus-ring"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          {t("tourDiscovery.maintenance.link")}
        </a>
      )}
      <p className="text-xs opacity-80">
        {t("tourDiscovery.maintenance.existing")}
      </p>
    </section>
  );
}
