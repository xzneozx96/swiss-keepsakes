import type { TourBooking } from "../types";

import { Alert } from "@heroui/react";
import { useEffect } from "react";

import { ExpiredNotice, ReconciliationNotice } from "./expired-notice";
import { useTourPayment } from "./use-tour-payment";

import { EmptyState } from "@/components/empty-state";
import { TourIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { ProviderPage } from "@/features/payment/components/provider-page";
import { useTourActions, useTours } from "@/features/tours/hooks/use-tours";

export function useOwnedBooking(bookingId: string) {
  const { bookings, guestId, now } = useTours("second");
  const { expireHolds } = useTourActions();
  const booking = bookings.find(
    (item) => item.id === bookingId && item.guestId === guestId,
  );
  const expired =
    booking?.status === "pending_payment" &&
    Date.parse(booking.holdUntil) <= now.getTime();

  useEffect(() => {
    if (expired) expireHolds();
  }, [expired, expireHolds]);

  return { booking, now };
}

export function MissingBooking() {
  const { t } = useLocale();

  return (
    <EmptyState
      action={{ label: t("tourBooking.explore"), to: "/tours" }}
      icon={TourIcon}
      message={t("tourBooking.missing")}
    />
  );
}

export function HoldNotice({
  booking,
  now,
}: {
  booking: TourBooking;
  now: Date;
}) {
  const { t } = useLocale();

  if (booking.status !== "pending_payment") return null;
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(booking.holdUntil) - now.getTime()) / 1000),
  );
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Alert className="alert--soft" status="warning">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t("tourBooking.hold", { time })}</Alert.Title>
        <Alert.Description>{t("tourBooking.holdBody")}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function TourPaymentPage({ bookingId }: { bookingId: string }) {
  const { booking, now } = useOwnedBooking(bookingId);

  return booking ? (
    <PaymentContent booking={booking} now={now} />
  ) : (
    <MissingBooking />
  );
}

function PaymentContent({ booking, now }: { booking: TourBooking; now: Date }) {
  const view = useTourPayment(booking, now);

  return (
    <div>
      {booking.status === "pending_payment" && (
        <div className="bg-background p-4">
          <HoldNotice booking={booking} now={now} />
        </div>
      )}
      {booking.status === "expired" && (
        <div className="flex flex-col gap-3 bg-background p-4">
          <ExpiredNotice booking={booking} />
          <ReconciliationNotice booking={booking} />
        </div>
      )}
      <ProviderPage view={view} />
    </div>
  );
}
