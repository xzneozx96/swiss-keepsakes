import type { Tour } from "../types";

import {
  Alert,
  Button,
  Description,
  Label,
  Radio,
  RadioGroup,
} from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { EmptyState } from "@/components/empty-state";
import { InfoIcon, SelectedIcon, TourIcon } from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { QuantityStepper } from "@/components/quantity-stepper";
import { StatusChip } from "@/components/status-chip";
import { SurfaceCard, SurfaceCardBlock } from "@/components/surface-card";
import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useTourActions, useTours } from "@/features/tours/hooks/use-tours";
import {
  availableSeats,
  firstPaymentAmount,
  nextAvailableDeparture,
  participantSeats,
  tourTotal,
  upcomingDepartures,
} from "@/features/tours/lib/selectors";
import { ageBandLabels } from "@/features/tours/discovery/age-bands";
import { useBack } from "@/hooks/use-back";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

export function TourSelectionPage({ slug }: { slug: string }) {
  const { tours } = useTours();
  const { t } = useLocale();
  const tour = tours.find((item) => item.slug === slug);

  if (!tour?.published)
    return (
      <EmptyState
        action={{ label: t("tourDiscovery.browse"), to: "/tours" }}
        icon={TourIcon}
        message={t("tourDiscovery.notFound")}
      />
    );

  return <TourSelection tour={tour} />;
}

function TourSelection({ tour }: { tour: Tour }) {
  const { t, language, intlLocale } = useLocale();
  const { data, draft, now } = useTours();
  const { updateDraft } = useTourActions();
  const navigate = useNavigate();
  const back = useBack(
    () =>
      void navigate({
        to: "/tours/$slug",
        params: { slug: tour.slug },
        replace: true,
      }),
  );
  const choices = upcomingDepartures(data, tour.id, now);
  const first = nextAvailableDeparture(data, tour.id, now);
  const changingTour = draft.tourId !== tour.id;
  const departureId = changingTour ? (first?.id ?? "") : draft.departureId;
  const group = changingTour ? { adults: 2, children: 1, infants: 0 } : draft;
  const selected = choices.find((departure) => departure.id === departureId);
  const seats = selected ? availableSeats(data, selected.id, now) : 0;
  const usedSeats = participantSeats(group);
  const overCapacity = usedSeats > seats;
  const valid =
    Boolean(selected) && seats > 0 && !overCapacity && group.adults >= 1;
  const total = tourTotal(tour, group);
  const dueToday = selected ? firstPaymentAmount(selected.policy, total) : 0;
  const ages = ageBandLabels(tour.ageBands, t);
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === "one" ? "one" : "other";
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const date = (iso: string) =>
    formatShortDate(zurichDate(new Date(iso)), zurichDate(now), intlLocale);
  const time = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zurich",
    }).format(new Date(iso));

  useEffect(() => {
    if (draft.tourId !== tour.id)
      updateDraft({
        tourId: tour.id,
        departureId: first?.id ?? "",
        adults: 2,
        children: 1,
        infants: 0,
      });
  }, [draft.tourId, tour.id, first?.id, updateDraft]);

  return (
    <div className="flex flex-1 flex-col">
      {/* The gift flow's in-flow sticky header (C04, C06). */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={t("tourDiscovery.back")} onPress={back} />
        <span className="min-w-0 flex-1 truncate font-serif text-card-title">
          {pickText(tour.name, language).text}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-5 px-6 pt-3 pb-6">
        <div className="flex flex-col gap-2 pb-2">
          <h1 className="font-serif text-title text-balance">
            {t("tourDiscovery.selectTitle")}
          </h1>
          <p className="text-sm text-muted">{t("tourDiscovery.selectIntro")}</p>
        </div>
        {choices.length === 0 ? (
          <EmptyState
            action={{ label: t("tourDiscovery.browse"), to: "/tours" }}
            icon={TourIcon}
            message={t("tourDiscovery.noDates")}
          />
        ) : (
          // C03 option sheet: white surface, filled option tiles. Chosen = red border and
          // the corner check, as on C03 (owner, round 3); no radio dot.
          <SurfaceCard>
            <RadioGroup
              className="gap-2 p-5"
              value={departureId}
              onChange={(value) => updateDraft({ departureId: value })}
            >
              <Label className="text-heading">
                {t("tourDiscovery.departures")}
              </Label>
              {choices.map((departure) => {
                const available = availableSeats(data, departure.id, now);

                return (
                  <Radio
                    key={departure.id}
                    className="group relative !mt-0 w-full rounded-2xl border-2 border-transparent bg-default px-3.5 py-3 transition-colors hover:bg-default-hover has-data-[focus-visible=true]:focus-ring data-[selected=true]:border-accent"
                    isDisabled={available === 0}
                    value={departure.id}
                  >
                    <Radio.Content className="items-start">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="font-semibold group-data-[selected=true]:text-accent-soft-foreground">
                          {date(departure.startsAt)} ·{" "}
                          {time(departure.startsAt)}
                        </span>
                        <Description className="px-0 group-data-[selected=true]:text-accent-soft-foreground">
                          {t("tourDiscovery.adults")} {money(tour.adultPrice)} ·{" "}
                          {t("tourDiscovery.children")} {money(tour.childPrice)}
                        </Description>
                        <Description className="px-0 group-data-[selected=true]:text-accent-soft-foreground">
                          {t(`tourDiscovery.policyShort.${departure.policy}`)}
                        </Description>
                        <div className="pt-1">
                          <StatusChip
                            tone={available > 0 ? "success" : "neutral"}
                          >
                            {available > 0
                              ? t(
                                  `tourDiscovery.available.${plural(available)}`,
                                  {
                                    count: available,
                                  },
                                )
                              : t("tourDiscovery.soldOut")}
                          </StatusChip>
                        </div>
                      </div>
                    </Radio.Content>
                    <SelectedIcon
                      aria-hidden
                      className="absolute -end-1 -top-1 hidden size-4.5 rounded-full bg-surface text-accent group-data-[selected=true]:block"
                      weight="Filled"
                    />
                  </Radio>
                );
              })}
            </RadioGroup>
          </SurfaceCard>
        )}
        <SurfaceCard>
          <SurfaceCardBlock>
            <h2 className="text-heading">{t("tourDiscovery.group")}</h2>
            {/* One row per age group, as the quantity row in the C03 sheet. The boxes keep
              their width when a hint wraps (the narrower card, German copy). */}
            <div className="flex flex-col divide-y divide-separator [&_.number-field\_\_group]:shrink-0 [&>*]:py-3.5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
              <QuantityStepper
                hint={`${ages.adults} · ${t("tourDiscovery.each", {
                  price: money(tour.adultPrice),
                })}`}
                label={t("tourDiscovery.adults")}
                max={Math.max(group.adults, seats - group.children, 1)}
                min={1}
                value={group.adults}
                onChange={(adults) => updateDraft({ adults })}
              />
              <QuantityStepper
                hint={`${ages.children} · ${t("tourDiscovery.each", {
                  price: money(tour.childPrice),
                })}`}
                label={t("tourDiscovery.children")}
                max={Math.max(group.children, seats - group.adults, 0)}
                min={0}
                value={group.children}
                onChange={(children) => updateDraft({ children })}
              />
              <QuantityStepper
                hint={`${ages.infants} · ${
                  tour.infantPrice
                    ? t("tourDiscovery.each", {
                        price: money(tour.infantPrice),
                      })
                    : t("tourDiscovery.free")
                } · ${t("tourDiscovery.noSeat")}`}
                label={t("tourDiscovery.infants")}
                max={6}
                min={0}
                value={group.infants}
                onChange={(infants) => updateDraft({ infants })}
              />
            </div>
          </SurfaceCardBlock>
          <SurfaceCardBlock>
            <p className="text-sm text-muted">{t("tourDiscovery.seatNote")}</p>
            <p aria-live="polite" className="font-semibold">
              {t(`tourDiscovery.seatSummary.${plural(usedSeats)}`, {
                count: usedSeats,
              })}
            </p>
            {selected && overCapacity && (
              <Alert className="alert--soft" status="warning">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>
                    {t("tourDiscovery.capacityError")}
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </SurfaceCardBlock>
        </SurfaceCard>
        {selected && (
          <SurfaceCard>
            <SurfaceCardBlock>
              <h2 className="text-heading">{t("tourDiscovery.payment")}</h2>
              <p className="text-sm">
                {t(`tourDiscovery.policy.${selected.policy}`)}
              </p>
            </SurfaceCardBlock>
            <SurfaceCardBlock>
              <dl className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>{t("tourDiscovery.total")}</dt>
                  <dd className="font-semibold tabular-nums">{money(total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>{t("tourDiscovery.dueToday")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {money(dueToday)}
                  </dd>
                </div>
                {dueToday < total && (
                  <div className="flex justify-between gap-3">
                    <dt className="flex flex-col gap-1">
                      {t("tourDiscovery.balance")}
                      <span className="text-xs text-muted">
                        {t("tourDiscovery.balanceDue", {
                          date: `${date(selected.balanceDueAt)} · ${time(selected.balanceDueAt)}`,
                        })}
                      </span>
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {money(total - dueToday)}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="text-xs text-muted">{t("tourDiscovery.sample")}</p>
            </SurfaceCardBlock>
          </SurfaceCard>
        )}
        {/* The C03 sheet's closing note: a plain icon line. */}
        <p className="flex items-start gap-2 text-sm">
          <InfoIcon
            aria-hidden
            className="mt-0.5 shrink-0 text-muted"
            size={16}
          />
          {t("tourDiscovery.noHold")}
        </p>
      </div>
      <div className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
        <div aria-live="polite" className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted">{t("tourDiscovery.total")}</span>
          <span className="text-lg font-semibold tabular-nums">
            {money(total)}
          </span>
        </div>
        <Button
          isDisabled={!valid}
          size="lg"
          onPress={() =>
            void navigate({
              to: "/tours/$slug/book/review",
              params: { slug: tour.slug },
            })
          }
        >
          {t("tourDiscovery.review")}
        </Button>
      </div>
    </div>
  );
}
