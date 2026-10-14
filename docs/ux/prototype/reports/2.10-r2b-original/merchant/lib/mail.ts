import type { TourBooking } from "../../types";
import type { Language } from "@/contexts/locale-context";
import type { DemoState } from "@/features/demo/types";
import type { MailParams } from "@/features/notifications/types";

import { bookingBalance, bookingPaid } from "../../lib/selectors";

import { sendMail } from "@/features/notifications/mail";
import { pickText } from "@/lib/localized";

/** Tour emails of spec §6 that flow 2 sends; rendered by `renderTourMail`. */
export type TourMailTemplate =
  "N07" | "N08" | "N09" | "N10" | "N11" | "N13" | "N15" | "N22";

/** What every tour email can show, worded in the recipient's language. Money in Rappen, dates ISO. */
function bookingParams(booking: TourBooking, language: Language): MailParams {
  return {
    ref: booking.ref,
    tour: pickText(booking.tourName, language).text,
    meetingPoint: pickText(booking.meetingPoint, language).text,
    startsAt: booking.startsAt,
    dueAt: booking.balanceDueAt,
    guest: booking.contactName,
    adults: booking.adults,
    children: booking.children,
    infants: booking.infants,
    total: booking.total,
    paid: bookingPaid(booking),
    balance: bookingBalance(booking),
  };
}

/**
 * Appends a guest email about `booking` to the demo mail log, in the language the guest
 * booked in (spec §6). Pass the booking as it is after the change, so paid and balance are
 * current; `params` adds or overrides values (e.g. `amount` of the payment for N07, N08, N22).
 */
export function mailTourGuest(
  state: DemoState,
  booking: TourBooking,
  template: TourMailTemplate,
  now: Date,
  params: MailParams = {},
): DemoState {
  return sendMail(state, {
    at: now.toISOString(),
    to: "guest",
    guestId: booking.guestId,
    language: booking.language,
    template,
    bookingId: booking.id,
    params: { ...bookingParams(booking, booking.language), ...params },
  });
}

/** The same for Owner and Manager, in the staff UI language (spec §6: N11, N22). */
export function mailTourStaff(
  state: DemoState,
  booking: TourBooking,
  template: TourMailTemplate,
  now: Date,
  staffLanguage: Language,
  params: MailParams = {},
): DemoState {
  return sendMail(state, {
    at: now.toISOString(),
    to: "staff",
    language: staffLanguage,
    template,
    bookingId: booking.id,
    params: { ...bookingParams(booking, staffLanguage), ...params },
  });
}
