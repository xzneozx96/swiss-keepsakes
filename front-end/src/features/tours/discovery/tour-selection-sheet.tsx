import type { Tour } from "../types";

import { Alert } from "@heroui/react";
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { ChoiceSheet } from "@/components/choice-sheet";
import { EmptyState } from "@/components/empty-state";
import { InfoIcon, TourIcon } from "@/components/icons";
import { QuantityStepper } from "@/components/quantity-stepper";
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
import { DeparturePicker } from "@/features/tours/discovery/departure-picker/departure-picker";
import {
  usePickerFormat,
  useSlotChoice,
  useSlotModel,
} from "@/features/tours/discovery/departure-picker/model";
import { formatMoney, formatShortDate, dateTimeFormat } from "@/lib/format";
import { pickText } from "@/lib/localized";

declare module "@tanstack/history" {
  interface HistoryState {
    /** C10 opened over C09's own entry: closing the sheet steps back to it, never adds one. */
    bookOverDetail?: boolean;
  }
}

/**
 * C10 departure and group: a bottom sheet on C09, as C03's "Your gift" sheet (2.4-r5). Its
 * address is `/tours/{slug}?book=true`, so a reload, Back from C11 and C11's Edit reopen it
 * with the draft; closing returns to C09 without leaving an entry to bounce on.
 */
export function TourSelectionSheet({
  tour,
  isOpen,
}: {
  tour: Tour;
  isOpen: boolean;
}) {
  const { t, language, intlLocale } = useLocale();
  const { data, draft, now } = useTours();
  const { updateDraft } = useTourActions();
  const navigate = useNavigate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // X, a swipe, Escape and the backdrop all close: one step back per history entry.
  const closedFrom = useRef<string>(undefined);
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
  const model = useSlotModel(tour);
  const picker = usePickerFormat(model.today);
  const choice = useSlotChoice(model, picker, {
    group,
    slotId: departureId,
    setSlotId: (id) => updateDraft({ departureId: id }),
  });
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === "one" ? "one" : "other";
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const date = (iso: string) =>
    formatShortDate(zurichDate(new Date(iso)), zurichDate(now), intlLocale);
  const time = (iso: string) =>
    dateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zurich",
    }).format(new Date(iso));

  const close = () => {
    const { state, href } = router.state.location;
    const entry = state.__TSR_key ?? href;

    if (closedFrom.current === entry) return;
    closedFrom.current = entry;
    if (canGoBack && state.bookOverDetail) router.history.back();
    else
      void navigate({
        to: "/tours/$slug",
        params: { slug: tour.slug },
        search: {},
        replace: true,
        resetScroll: false,
      });
  };

  // Closed: Forward may bring the same entry back, and its X must work again.
  useEffect(() => {
    if (!isOpen) closedFrom.current = undefined;
  }, [isOpen]);

  // Only an open sheet starts a draft for this tour: viewing C09 keeps another tour's draft.
  useEffect(() => {
    if (isOpen && draft.tourId !== tour.id)
      updateDraft({
        tourId: tour.id,
        departureId: first?.id ?? "",
        adults: 2,
        children: 1,
        infants: 0,
      });
  }, [isOpen, draft.tourId, tour.id, first?.id, updateDraft]);

  return (
    <ChoiceSheet
      action={{
        label: t("tourDiscovery.review", { total: money(total) }),
        isDisabled: !valid,
        onPress: () =>
          void navigate({
            to: "/tours/$slug/book/review",
            params: { slug: tour.slug },
          }),
      }}
      closeLabel={t("tourDiscovery.close")}
      isOpen={isOpen}
      title={pickText(tour.name, language).text}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DeparturePicker
        key={tour.id}
        choice={choice}
        config={{
          policyText: (policy) => t(`tourDiscovery.policyShort.${policy}`),
          policyVaries: picker.t("policyVaries"),
          empty: (
            <EmptyState
              action={{ label: t("tourDiscovery.browse"), to: "/tours" }}
              icon={TourIcon}
              message={t("tourDiscovery.noDates")}
            />
          ),
          soldOut: (
            <p className="text-sm text-foreground">
              {t("tourDiscovery.soldOutBody")}
            </p>
          ),
        }}
        f={picker}
        model={model}
      />
      {/* Ink, as the sheet's field labels; the drawer body's own text is muted. */}
      <section className="flex flex-col gap-3 text-foreground">
        <h3 className="text-heading">{t("tourDiscovery.group")}</h3>
        {/* One row per age group, as the quantity row in the C03 sheet. The boxes keep their
            width when a hint wraps (German copy). */}
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
      </section>
      {selected && (
        <section className="flex flex-col gap-3 text-foreground">
          <h3 className="text-heading">{t("tourDiscovery.payment")}</h3>
          <p className="text-sm">
            {t(`tourDiscovery.policy.${selected.policy}`)}
          </p>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>{t("tourDiscovery.total")}</dt>
              <dd className="font-semibold tabular-nums">{money(total)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>{t("tourDiscovery.dueToday")}</dt>
              <dd className="font-semibold tabular-nums">{money(dueToday)}</dd>
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
        </section>
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
    </ChoiceSheet>
  );
}
