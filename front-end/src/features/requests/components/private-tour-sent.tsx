import { buttonVariants } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { StatusSuccessIcon, TourIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemo, useDemoNow } from "@/features/demo";
import { formatShortDate } from "@/lib/format";

/**
 * C22 sent, in C07's grammar: the success mark and title, who replies and where, then the
 * request as sent in a white card. No reply time (R03) and no confirmation email (A2).
 */
export function PrivateTourSent({ requestId }: { requestId?: string }) {
  const { t, intlLocale } = useLocale();
  const { state } = useDemo();
  const today = zurichDate(useDemoNow());
  const request = state.data.privateTourRequests.find(
    (r) => r.id === requestId,
  );

  if (!request) {
    return (
      <div className="flex flex-col gap-6 px-6 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <h1 className="font-serif text-display">{t("privateTour.title")}</h1>
        <EmptyState
          action={{ label: t("privateTour.back"), to: "/tours" }}
          icon={TourIcon}
          message={t("privateTour.sent.missing")}
        />
      </div>
    );
  }

  const day = (iso: string) => formatShortDate(iso, today, intlLocale);
  const rows = [
    {
      label: t("privateTour.sent.group"),
      value: t(
        request.groupSize === 1
          ? "privateTour.sent.people.one"
          : "privateTour.sent.people.other",
        { count: request.groupSize },
      ),
    },
    {
      label: t("privateTour.sent.dates"),
      value:
        request.dateTo === request.dateFrom
          ? day(request.dateFrom)
          : `${day(request.dateFrom)} – ${day(request.dateTo)}`,
    },
    ...(request.interests
      ? [{ label: t("privateTour.sent.interests"), value: request.interests }]
      : []),
    { label: t("privateTour.sent.email"), value: request.email },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-10 px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-8">
        <header className="flex flex-col items-start gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success-soft-foreground">
            <StatusSuccessIcon aria-hidden size={30} />
          </span>
          <h1 className="font-serif text-display">
            {t("privateTour.sent.title")}
          </h1>
          <p className="text-muted">
            {t("privateTour.sent.body", { email: request.email })}
          </p>
        </header>

        <section
          aria-labelledby="private-tour-sent-summary"
          className="flex flex-col gap-4"
        >
          <h2 className="text-heading" id="private-tour-sent-summary">
            {t("privateTour.sent.summary")}
          </h2>
          <dl className="flex flex-col divide-y divide-separator rounded-3xl bg-surface px-5 shadow-surface">
            {rows.map((row) => (
              <div key={row.label} className="flex flex-col gap-0.5 py-3.5">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className="font-medium break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="sticky bottom-0 z-30 flex border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <Link
          className={buttonVariants({ fullWidth: true, size: "lg" })}
          to="/tours"
        >
          {t("privateTour.back")}
        </Link>
      </div>
    </div>
  );
}
