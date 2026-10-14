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
  published: boolean;
  commissionRate: number;
  itinerary: TourStop[];
  ageBands: TourAgeBands;
  participantFields: TourParticipantField[];
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
