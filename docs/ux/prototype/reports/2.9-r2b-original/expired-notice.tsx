import type { TourBooking } from "../types";

import { Alert, Button } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";

import { useBookingFormat } from "./booking-summary";
import { openPayment } from "./transitions";

import { StateHeadline } from "@/components/state-headline";
import { SurfaceCard, SurfaceCardBlock } from "@/components/surface-card";
import { useLocale } from "@/contexts/locale-context";
import { useTourActions, useTours } from "@/features/tours/hooks/use-tours";
import {
  reconciliationAmount,
  reconciliationPayments,
} from "@/features/tours/lib/selectors";

/**
 * R06: a new booking for the same tour, prefilled from the expired one. C10 shows today's seats
 * and prices; nothing is held until the guest submits C11 again.
 */
export function useRebook(booking: TourBooking) {
  const { tours } = useTours();
  const { updateDraft } = useTourActions();
  const navigate = useNavigate();
  const tour = tours.find((item) => item.id === booking.tourId);

  if (!tour) return null;

  return () => {
    updateDraft({
      tourId: booking.tourId,
      departureId: booking.departureId,
      adults: booking.adults,
      children: booking.children,
      infants: booking.infants,
      contactName: booking.contactName,
      phone: booking.phone,
    });
    void navigate({ to: "/tours/$slug/book", params: { slug: tour.slug } });
  };
}

/**
 * The expired hold (C12, C16): seats released, old payment closed, rebook through C10. Styled as
 * the C15 overdue state: a headline card with the one next action.
 */
export function ExpiredNotice({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const rebook = useRebook(booking);

  if (booking.status !== "expired") return null;

  return (
    <SurfaceCard aria-labelledby="booking-expired">
      <SurfaceCardBlock>
        <StateHeadline
          body={
            openPayment(booking)
              ? `${t("tourBooking.expiredBody")} ${t("tourBooking.sessionClosed")}`
              : t("tourBooking.expiredBody")
          }
          id="booking-expired"
          status="danger"
          title={t("tourBooking.expired")}
        />
        {rebook && (
          <Button fullWidth size="lg" onPress={rebook}>
            {t("tourBooking.rebook")}
          </Button>
        )}
      </SurfaceCardBlock>
    </SurfaceCard>
  );
}

/** Money that arrived after expiry: never confirms the booking, kept for reconciliation. */
export function ReconciliationNotice({ booking }: { booking: TourBooking }) {
  const { t } = useLocale();
  const { money, date } = useBookingFormat();
  const payments = reconciliationPayments(booking);

  if (!payments.length) return null;

  return (
    <Alert className="w-full" role="status" status="danger">
      <Alert.Indicator />
      <Alert.Content className="min-w-0 gap-2">
        <Alert.Title>{t("tourBooking.reconcile.title")}</Alert.Title>
        <Alert.Description>
          {t("tourBooking.reconcile.body", {
            amount: money(reconciliationAmount(booking)),
          })}
        </Alert.Description>
        <ul className="flex flex-col gap-1 text-sm">
          {payments.map((payment) => {
            const late = booking.lateResults?.find(
              (result) => result.paymentId === payment.id,
            );

            return (
              <li key={payment.id} className="tabular-nums">
                {money(payment.amount)} ·{" "}
                {t("tourBooking.payment.paidAt", { date: date(payment.at) })}
                {late &&
                  ` · ${t("tourBooking.payment.receivedAt", {
                    date: date(late.receivedAt),
                  })}`}
              </li>
            );
          })}
        </ul>
      </Alert.Content>
    </Alert>
  );
}
