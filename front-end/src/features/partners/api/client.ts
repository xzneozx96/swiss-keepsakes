import type { CommissionAdjustment, Partner, PartnerPayout, ReferralVisit } from '@sk/domain/partners'

/** Referral partners, their link visits, commission adjustments and payouts (P02, M15, M16). */
export interface PartnersClient {
  partners: () => Promise<Partner[]>
  referralVisits: () => Promise<ReferralVisit[]>
  commissionAdjustments: () => Promise<CommissionAdjustment[]>
  partnerPayouts: () => Promise<PartnerPayout[]>
}
