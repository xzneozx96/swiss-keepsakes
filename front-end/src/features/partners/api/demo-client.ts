import type { PartnersClient } from './client'
import type { DemoStore } from '@/features/demo/store'

export function createPartnersDemoClient(store: DemoStore): PartnersClient {
  const data = () => store.getState().data

  return {
    partners: async () => data().partners,
    referralVisits: async () => data().referralVisits,
    commissionAdjustments: async () => data().commissionAdjustments,
    partnerPayouts: async () => data().partnerPayouts,
  }
}
