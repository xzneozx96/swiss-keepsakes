import type { Language } from "@/contexts/locale-context";
import type { LocalizedText, ProductStory } from "@/features/catalog/types";
import type { TripRecord } from "@/features/checkout/types";
import type { Payment, PaymentMethod } from "@/features/orders/types";

export type TourPaymentPolicy = "full" | "deposit" | "later";
/**
 * What happens when the balance deadline passes (R07, AC27). Absent: the merchant decides.
 * "cancel" cancels and releases seats; "grace" waits graceHours, then the merchant decides.
 */
export type TourOverduePolicy =
  { action: "cancel" } | { action: "grace"; graceHours: number };
/**
 * What a section's items look like on the page. A render hint, not a meaning: a layout the
 * page does not know falls back to the title, the text and a plain list.
 */
export type TourSectionLayout =
  "text" | "list" | "timeline" | "facts" | "notice";
/** One row of a section: a timetable row, a fact or a restaurant. */
export interface TourSectionItem {
  id: string;
  /** A time window, a fact name or a place name. */
  label?: LocalizedText;
  text: LocalizedText;
  detail?: LocalizedText;
  /** The itinerary stop this row belongs to. */
  stopId?: string;
  /** A keepsake (`Product.id`) this row points to. */
  giftId?: string;
  contact?: { address?: string; phone?: string; email?: string; url?: string };
  optional?: boolean;
}
/**
 * Free-form tour content beyond the typed core (prices, departures, stops, policies):
 * practical information, a timetable, seasonal notices and lunch options.
 */
export interface TourSection {
  id: string;
  layout: TourSectionLayout;
  title: LocalizedText;
  /** Plain text; a blank line starts a new paragraph. */
  body?: LocalizedText;
  items?: TourSectionItem[];
}
/**
 * A tour the merchant paused for maintenance (R21): guests read the reason, and booking is
 * switched off. Bookings and departures that already exist are not touched, and the status
 * never ends by itself: the merchant turns it off.
 */
export interface TourMaintenance {
  active: boolean;
  reason: LocalizedText;
  /** Optional link to a notice page (https). */
  url?: string;
  /** ISO date shown as "Expected back"; display only. */
  expectedBack?: string;
}
export interface TourStop {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  minutesFromStart: number;
  coordinates: [number, number];
  photo: string;
  /** Practical tip for this stop (access, facilities), shown in the stop sheet. */
  note?: LocalizedText;
}
export interface Tour {
  id: string;
  slug: string;
  name: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  /** The long, illustrated story behind the tour (same shape as a gift's story). */
  longStory?: ProductStory;
  photos: string[];
  durationMinutes: number;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  meetingPoint: LocalizedText;
  included: LocalizedText[];
  excluded: LocalizedText;
  conditions: LocalizedText;
  cancellationPolicy: LocalizedText;
  /** Set when archived in M11: unpublished, off C08 and M11's active list until restored as a draft. */
  archivedAt?: string;
  published: boolean;
  /**
   * Created in M13 and never published yet: hidden from C08 until its first publish. A
   * draft without it (the seeded Pilatus) shows on C08 as "Coming soon".
   */
  unannounced?: boolean;
  commissionRate: number;
  itinerary: TourStop[];
  ageBands: TourAgeBands;
  participantFields: TourParticipantField[];
  /** Free-form content shown after "About this experience" (guest) or kept for the merchant (staff). */
  sections?: TourSection[];
  /** When the practical information was last verified (ISO date); shown as "Checked on". */
  checkedOn?: string;
  maintenance?: TourMaintenance;
  /**
   * Keepsakes (`Product.id`) the merchant links to this tour, in the order guests see them
   * (at most the first three). They are ordered separately from the booking, never in it.
   */
  keepsakeIds?: string[];
}
/** Sample age bands per tour: infants are younger than childFrom, adults are adultFrom or older. */
export interface TourAgeBands {
  childFrom: number;
  adultFrom: number;
}
/** A merchant-configured question for the booking form (beyond contact name and phone). */
export interface TourParticipantField {
  id: string;
  label: LocalizedText;
  required: boolean;
}
export interface Departure {
  id: string;
  tourId: string;
  startsAt: string;
  capacity: number;
  policy: TourPaymentPolicy;
  balanceDueAt: string;
  closed: boolean;
  overduePolicy?: TourOverduePolicy;
  /** The merchant cancelled this departure (seeded; cancellation operations are Phase 3). */
  cancelledAt?: string;
}
export interface TourParticipants {
  adults: number;
  children: number;
  infants: number;
}
export interface TourDraft extends TourParticipants {
  tourId: string;
  departureId: string;
  contactName: string;
  phone: string;
  childName: string;
  /** Answers to the tour's participantFields, by field id (C11). */
  participantAnswers?: Record<string, string>;
}
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "expired"
  | "delivered"
  | "completed"
  | "no_show"
  | "cancelled";
interface BookingRecord extends TourParticipants {
  id: string;
  ref: string;
  guestId: string;
  language: Language;
  tourId: string;
  departureId: string;
  tourName: LocalizedText;
  meetingPoint: LocalizedText;
  startsAt: string;
  endsAt: string;
  contactName: string;
  phone: string;
  childName: string;
  total: number;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  cancellationPolicy: LocalizedText;
  firstAmount: number;
  policy: TourPaymentPolicy;
  balanceDueAt: string;
  /** Snapshot of the departure's overdue policy at booking time; absent = merchant decides. */
  overduePolicy?: TourOverduePolicy;
  partnerId: string | null;
  commissionRate: number;
  createdAt: string;
  /** Optional trip answers for this booking (R09, 2.17). */
  trip?: TripRecord;
  /** The tour's participant questions as asked at booking time, with the answers given. */
  participantInfo?: { label: LocalizedText; value: string }[];
  payments: Payment[];
  /**
   * Provider results that arrived after the hold had ended (2.7): when the money actually moved
   * (`paidAt`, null when the provider closed the session without a charge) and when the result
   * reached the site. The payment itself stays in `payments` for reconciliation.
   */
  lateResults?: {
    paymentId: string;
    paidAt: string | null;
    receivedAt: string;
  }[];
  activity: { at: string; event: string; actor: string }[];
  commissionRecordedAt: string | null;
}
export type TourBooking = BookingRecord &
  (
    | { status: "pending_payment"; holdUntil: string }
    | { status: Exclude<BookingStatus, "pending_payment">; holdUntil: null }
  );
export interface TourData {
  tours: Tour[];
  departures: Departure[];
  bookings: TourBooking[];
  draft: TourDraft;
}
export type TourActionResult = { ok: true } | { ok: false; reason: string };
export type ExternalTourPayment = {
  amount: number;
  method: Exclude<PaymentMethod, "online">;
  note: string;
};
