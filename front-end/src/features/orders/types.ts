import type {
  LocalizedText,
  PaymentPolicy,
  Rappen,
} from "@/features/catalog/types";
import type { Language } from "@/contexts/locale-context";
import type { TripRecord } from "@/features/checkout/types";

/** Progress of a gift order (UX spec §2.1). Payment is a separate label, derived from payments. */
export type OrderStatus =
  | "requested"
  | "accepted"
  | "preparing"
  | "ready"
  | "handed_over"
  | "completed"
  | "declined"
  | "cancelled";

export type StaffId = "owner" | "manager";
export type Actor = StaffId | "guest" | "system";

export interface OrderLine {
  id: string;
  productId: string;
  variantId: string;
  /** Snapshots at the time of ordering (AC15): later product edits never change the order. */
  productName: LocalizedText;
  variantLabel: LocalizedText;
  unitPrice: Rappen;
  quantity: number;
  engraving?: string;
  commissionRate: number;
}

export type PaymentMethod = "online" | "cash" | "bank-transfer" | "other";

export interface Payment {
  id: string;
  amount: Rappen;
  method: PaymentMethod;
  /** Online payments count only when the provider confirms them (spec §2.3). */
  status: "processing" | "succeeded" | "failed";
  at: string;
  recordedBy?: StaffId;
  note?: string;
}

export type LogEvent =
  | { type: "requested" }
  | {
      type: "pickup-changed";
      field: "date" | "place";
      from: string;
      to: string;
      note: string;
    }
  | { type: "accepted" }
  | { type: "declined"; reason: string }
  | { type: "payment"; paymentId: string }
  /** The provider's answer for an online payment started earlier. */
  | {
      type: "payment-result";
      paymentId: string;
      status: "succeeded" | "failed";
    }
  | { type: "ready" }
  | { type: "handed-over" }
  | { type: "completed" }
  | { type: "cancelled"; reason: "overdue" | "guest" | "merchant" };

export type LogEntry = LogEvent & { at: string; actor: Actor };

export interface Order {
  id: string;
  /** Guest-facing reference, e.g. SK-1042. */
  ref: string;
  guestId: string;
  /** Language the guest ordered in; emails to the guest use it (spec §6). */
  language: Language;
  createdAt: string;
  lines: OrderLine[];
  pickupDate: string;
  pickupPlaceId: string;
  /** Policies as at the time of ordering (AC15). */
  paymentPolicy: PaymentPolicy;
  cancellationPolicy: LocalizedText;
  status: OrderStatus;
  /** Referral partner locked at order time (AC11); null for direct. */
  partnerId: string | null;
  acceptedAt?: string;
  firstPaymentDueAt?: string;
  balanceDueDate?: string;
  completedAt?: string;
  completedBy?: StaffId;
  /** Set once, when the order completes; partner commission is "Recorded" from then on (AC10). */
  commissionRecordedAt?: string;
  payments: Payment[];
  log: LogEntry[];
  /** Optional trip answers for this order (R09, 2.17). */
  trip?: TripRecord;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  /**
   * Profile photo: "sample:<slug>" for a bundled avatar (the seeded default, 1.12t) or an
   * uploaded 256px JPEG data URL (1.12s); absent = a sample avatar picked from the name.
   */
  avatar?: string;
}
