import type { Rappen } from '@/features/catalog/types'
import type { PaymentMethod, StaffId } from '@/features/orders/types'

export interface Partner {
  id: string
  name: string
  kind: 'hotel' | 'guide' | 'other'
  /** Code in the public referral link /r/{code}. */
  code: string
  /** Registered email; the P01 code goes here (N19). */
  email: string
  /** Private report link /partner/{token}; null after the Owner revokes it (R10). */
  reportToken: string | null
  /** Earlier report links, kept so a revoked link can say it is no longer valid. */
  revokedTokens: string[]
  /**
   * Set when archived in M15 (D17): the QR link stops crediting new visits and the report
   * link stops working; the ledger stays, and money owed can still be paid.
   */
  archivedAt?: string
}

/**
 * A partner who entered the emailed code on this browser (R10): the report opens without a
 * code for 30 days, while the token is still the partner's current report link.
 */
export interface PartnerSession {
  token: string
  partnerId: string
  verifiedAt: string
}

/** A visit through a partner's QR or link; the latest within 30 days wins (PRD §10.1). */
export interface ReferralVisit {
  partnerId: string
  at: string
}

/** An order or a tour booking, the two kinds of transaction that earn commission. */
export interface TransactionRef {
  kind: 'order' | 'booking'
  id: string
}

/** Money the merchant paid a partner outside the app, recorded in M16 (AC13). */
export interface PartnerPayout {
  id: string
  partnerId: string
  amount: Rappen
  method: PaymentMethod
  /** The day the money was paid, YYYY-MM-DD. */
  paidOn: string
  reference?: string
  recordedBy: StaffId
  recordedAt: string
}

/**
 * Commission lowered after a refund on one line (spec §2.4, O08). Basis and rate stay as
 * booked. Phase 5 seeds one; M10 writes the same record in Phase 3 (outline D3).
 */
export interface CommissionAdjustment {
  id: string
  partnerId: string
  transaction: TransactionRef
  lineId: string
  /** Amount refunded to the guest on that line. */
  refunded: Rappen
  /** Commission removed: refunded × rate at booking, as a positive amount. */
  commission: Rappen
  reason: 'refund'
  at: string
  recordedBy: StaffId
}
