import type {
  TourActionResult,
  TourBooking,
  TourData,
  TourDraft,
} from "../types";
import type { DemoState } from "@/features/demo/types";
import type { Outcome } from "@/features/payment/hooks/use-payment";
import type {
  ExternalPaymentInput,
  StaffContext,
  TourOutcome,
} from "../merchant/lib/transitions";

import { availableSeats, bookingAmountDue } from "../lib/selectors";
import { mailTourGuest, mailTourStaff } from "../merchant/lib/mail";
import { createTourSeed } from "../seed";
import {
  activeHold,
  addBooking,
  applyProviderResult,
  bookingMails,
  expireLapsedHolds,
  missingParticipantInfo,
  newBooking,
  openPayment,
} from "../booking/transitions";
import {
  cancelOverdueBookings,
  externalPaymentBlock,
  outcomeBlock,
  skipPastBalanceDeadline,
  recordExternalPayment,
  recordOutcome,
  sendTourReminders,
} from "../merchant/lib/transitions";

import { useLocale } from "@/contexts/locale-context";
import { useDemoActions, useDemoSelector } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { attributedPartnerId } from "@/features/partners/referral";
import { useSharedClock } from "@/hooks/use-shared-clock";

const fallback = createTourSeed();

/** Only a countdown needs "second"; every other screen reads the clock to the minute. */
export function useTours(precision: "minute" | "second" = "minute") {
  const tours = useDemoSelector((s) => s.data.tours);
  const clockStartedAt = useDemoSelector((s) => s.clockStartedAt);
  const guestId = useDemoSelector((s) => s.data.signedInGuestId);
  const role = useDemoSelector((s) => s.role);
  const tick = useSharedClock(precision === "second" ? 1_000 : 60_000);
  const data = tours ?? fallback;

  return {
    data,
    ...data,
    now: demoNow(clockStartedAt, tick),
    guestId,
    role,
  };
}

export function useTourActions() {
  const { update } = useDemoActions();
  const tours = useDemoSelector((s) => s.data.tours);
  const clockStartedAt = useDemoSelector((s) => s.clockStartedAt);
  const signedInGuestId = useDemoSelector((s) => s.data.signedInGuestId);
  const referralVisits = useDemoSelector((s) => s.data.referralVisits);
  const staffRole = useDemoSelector((s) => s.role);
  const { language } = useLocale();
  const currentData = tours ?? fallback;
  const now = () => demoNow(clockStartedAt);
  const change = (recipe: (data: typeof currentData) => typeof currentData) =>
    update((s) => ({
      ...s,
      data: { ...s.data, tours: recipe(s.data.tours ?? createTourSeed()) },
    }));
  const updateDraft = (patch: Partial<TourDraft>) =>
    change((data) => ({ ...data, draft: { ...data.draft, ...patch } }));
  const createBooking = ():
    { bookingId: string } | { error: string; bookingId?: string } => {
    const draft = currentData.draft;
    const guestId = signedInGuestId;
    const tour = currentData.tours.find((t) => t.id === draft.tourId);
    const departure = currentData.departures.find(
      (d) => d.id === draft.departureId && d.tourId === draft.tourId,
    );

    if (!guestId) return { error: "sign-in" };
    if (
      !tour?.published ||
      !departure ||
      departure.closed ||
      Date.parse(departure.startsAt) <= now().getTime()
    )
      return { error: "departure" };
    if (
      draft.adults < 1 ||
      [draft.adults, draft.children, draft.infants].some(
        (n) => !Number.isInteger(n) || n < 0,
      )
    )
      return { error: "participants" };
    const held = activeHold(currentData, guestId, departure.id, now());

    if (held) return { error: "held", bookingId: held.id };
    if (
      draft.adults + draft.children >
      availableSeats(currentData, departure.id, now())
    )
      return { error: "capacity" };
    if (!draft.contactName.trim() || !/^\+?[\d ()-]{8,}$/.test(draft.phone))
      return { error: "contact" };
    if (missingParticipantInfo(tour, draft.participantAnswers).length)
      return { error: "participant-info" };
    const booking = newBooking({
      id: crypto.randomUUID(),
      tour,
      departure,
      draft,
      guestId,
      partnerId: attributedPartnerId(referralVisits, now()),
      language,
      now: now(),
    });

    // Rechecked on the latest state: if the seats went meanwhile, nothing is added and the
    // review page reports it (it waits for the booking to appear before leaving).
    changeAndMail(booking.id, (data) => addBooking(data, booking, now()));

    return { bookingId: booking.id };
  };
  const modify = (id: string, recipe: (b: TourBooking) => TourBooking) =>
    change((data) => ({
      ...data,
      bookings: data.bookings.map((b) => (b.id === id ? recipe(b) : b)),
    }));
  const expireHolds = () => change((data) => expireLapsedHolds(data, now()));
  /** A tour change plus the emails it calls for, in one update (spec §6, worker C's helpers). */
  const changeAndMail = (id: string, recipe: (data: TourData) => TourData) =>
    update((s) => {
      const before = s.data.tours ?? createTourSeed();
      const after = recipe(before);
      const was = before.bookings.find((b) => b.id === id);
      const is = after.bookings.find((b) => b.id === id);
      const at = demoNow(s.clockStartedAt);
      const next: DemoState = { ...s, data: { ...s.data, tours: after } };

      if (!is || is === was) return next;

      return bookingMails(was, is).reduce(
        (mailed, mail) =>
          mail.to === "staff"
            ? mailTourStaff(
                mailed,
                is,
                mail.template,
                at,
                language,
                mail.params,
              )
            : mailTourGuest(mailed, is, mail.template, at, mail.params),
        next,
      );
    });
  const pay = (id: string, outcome: Outcome): TourActionResult => {
    const booking = currentData.bookings.find((b) => b.id === id);

    if (
      !booking ||
      booking.guestId !== signedInGuestId ||
      ["expired", "cancelled", "completed", "no_show"].includes(booking.status)
    )
      return { ok: false, reason: "blocked" };
    if (
      booking.status === "pending_payment" &&
      Date.parse(booking.holdUntil) <= now().getTime()
    ) {
      expireHolds();

      return { ok: false, reason: "expired" };
    }
    if (booking.payments.some((p) => p.status === "processing"))
      return { ok: false, reason: "processing" };
    const amount = bookingAmountDue(booking);

    if (amount <= 0) return { ok: false, reason: "paid" };
    changeAndMail(id, (data) => ({
      ...data,
      bookings: data.bookings.map((b) =>
        b.id === id ? startPayment(b, outcome) : b,
      ),
    }));

    return { ok: true };
  };
  const startPayment = (b: TourBooking, outcome: Outcome): TourBooking => {
    if (
      ["expired", "cancelled", "completed", "no_show"].includes(b.status) ||
      b.payments.some((p) => p.status === "processing") ||
      bookingAmountDue(b) <= 0
    )
      return b;
    const at = now().toISOString();
    const payment = {
      id: crypto.randomUUID(),
      amount: bookingAmountDue(b),
      method: "online",
      status: outcome,
      at,
    } as const;
    const next = {
      ...b,
      payments: [...b.payments, payment],
      activity: [
        ...b.activity,
        { at, event: `payment-${outcome}`, actor: "guest" },
      ],
    };

    return outcome === "succeeded" && b.status === "pending_payment"
      ? { ...next, status: "confirmed", holdUntil: null }
      : next;
  };
  /** Prototype provider: answers the booking's open online payment (late if the hold ended). */
  const resolvePayment = (
    id: string,
    outcome: "succeeded" | "failed",
    paidAt?: string,
  ): TourActionResult => {
    const booking = currentData.bookings.find((b) => b.id === id);
    const payment = booking && openPayment(booking);

    if (!payment) return { ok: false, reason: "no-open-payment" };
    changeAndMail(id, (data) =>
      applyProviderResult(
        data,
        id,
        payment.id,
        outcome,
        paidAt ?? now().toISOString(),
        now(),
      ),
    );

    return { ok: true };
  };
  /** Prototype provider: sends its last answer again; an answered payment ignores it. */
  const repeatProviderResult = (id: string): TourActionResult => {
    const booking = currentData.bookings.find((b) => b.id === id);
    const last = [...(booking?.payments ?? [])]
      .reverse()
      .find((p) => p.method === "online" && p.status !== "processing");

    if (!last || last.status === "processing")
      return { ok: false, reason: "no-result" };
    const outcome = last.status;

    changeAndMail(id, (data) =>
      applyProviderResult(data, id, last.id, outcome, last.at, now()),
    );

    return { ok: false, reason: "already-recorded" };
  };
  // Merchant actions (steps 2.11–2.14): guard on the screen's state, then the pure
  // transition re-checks inside `update`, so a stale screen or double tap changes nothing.
  const staffContext = (s: DemoState): StaffContext => ({
    now: demoNow(s.clockStartedAt),
    role: s.role,
    language,
  });
  const recordPayment = (
    id: string,
    input: ExternalPaymentInput,
  ): TourActionResult => {
    const booking = currentData.bookings.find((b) => b.id === id);
    const block = booking
      ? externalPaymentBlock(booking, input, staffRole, now())
      : { code: "unavailable" };

    if (block) return { ok: false, reason: block.code };
    update((s) => recordExternalPayment(s, id, input, staffContext(s)));

    return { ok: true };
  };
  const outcome = (id: string, result: TourOutcome): TourActionResult => {
    const booking = currentData.bookings.find((b) => b.id === id);
    const block = booking
      ? outcomeBlock(booking, result, staffRole, now())
      : { code: "unavailable" };

    if (block) return { ok: false, reason: block.code };
    update((s) => recordOutcome(s, id, result, staffContext(s)));

    return { ok: true };
  };
  /** Balance-deadline check (R07): cancels only where the snapshotted policy says so. */
  const checkOverdue = () =>
    update((s) =>
      cancelOverdueBookings(s, demoNow(s.clockStartedAt), language),
    );
  /** Prototype reminder run: N10 (proposed timing) and N13. */
  const sendReminders = () =>
    update((s) => sendTourReminders(s, demoNow(s.clockStartedAt)));
  /** Prototype control: the demo clock skips past this booking's balance deadline. */
  const skipPastDeadline = (id: string) =>
    update((s) => skipPastBalanceDeadline(s, id, language));
  const expireBooking = (id: string) =>
    modify(id, (b) =>
      b.status === "pending_payment"
        ? { ...b, status: "expired", holdUntil: null }
        : b,
    );

  return {
    updateDraft,
    createBooking,
    expireHolds,
    pay,
    resolvePayment,
    repeatProviderResult,
    recordPayment,
    outcome,
    checkOverdue,
    sendReminders,
    skipPastDeadline,
    expireBooking,
  };
}
