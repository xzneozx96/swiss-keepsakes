import type {
  CommissionAdjustment,
  Partner,
  PartnerPayout,
  ReferralVisit,
} from '@sk/domain/partners'

/** Referral partners, their link visits, commission adjustments and payouts (P02, M15, M16). */
export interface PartnersClient {
  partners: () => Promise<Partner[]>
  referralVisits: () => Promise<ReferralVisit[]>
  commissionAdjustments: () => Promise<CommissionAdjustment[]>
  partnerPayouts: () => Promise<PartnerPayout[]>
  /** A guest opened a partner's link (/r/{code}); attribution reads the latest visit (AC11). */
  recordVisit: (input: { partnerId: string }) => Promise<void>
  addPartner: (partner: Partner) => Promise<void>
  /** Archived partners keep their ledger and reports; their links stop attributing (D17). */
  setPartnerArchived: (input: { id: string, archived: boolean }) => Promise<void>
  /** Only for a partner with no link opens and no transactions (D17). */
  deletePartner: (input: { id: string }) => Promise<void>
  /** Money paid outside the app, recorded by the signed-in Owner or Manager (5.4, AC13). */
  recordPayout: (
    payout: Omit<PartnerPayout, 'id' | 'recordedAt' | 'recordedBy'>,
  ) => Promise<void>
  /** The current report link stops working at once (R10, Q5). */
  revokeReportLink: (input: { id: string }) => Promise<void>
  /** A new private report link after a revoke (R10). */
  issueReportLink: (input: { id: string, token: string }) => Promise<void>
}
