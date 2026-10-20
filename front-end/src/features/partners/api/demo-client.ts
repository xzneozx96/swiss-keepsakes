import type { Partner } from '@sk/domain/partners'
import type { PartnersClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'

export function createPartnersDemoClient(store: DemoStore): PartnersClient {
  const data = () => store.getState().data
  const setPartner = (id: string, change: (partner: Partner) => Partner) =>
    updateCollection(store, 'partners', partners =>
      partners.map(p => (p.id === id ? change(p) : p)))

  return {
    partners: async () => data().partners,
    referralVisits: async () => data().referralVisits,
    commissionAdjustments: async () => data().commissionAdjustments,
    partnerPayouts: async () => data().partnerPayouts,
    recordVisit: async ({ partnerId }) => {
      updateCollection(store, 'referralVisits', (visits, s) => [
        ...visits,
        { partnerId, at: demoNow(s.clockStartedAt).toISOString() },
      ])
    },
    addPartner: async (partner) => {
      updateCollection(store, 'partners', partners => [...partners, partner])
    },
    setPartnerArchived: async ({ id, archived }) => {
      const at = archived
        ? demoNow(store.getState().clockStartedAt).toISOString()
        : undefined

      setPartner(id, p => ({ ...p, archivedAt: at }))
    },
    deletePartner: async ({ id }) => {
      updateCollection(store, 'partners', partners =>
        partners.filter(p => p.id !== id))
    },
    recordPayout: async (payout) => {
      updateCollection(store, 'partnerPayouts', (payouts, s) => {
        if (s.role !== 'owner' && s.role !== 'manager')
          return payouts
        const now = demoNow(s.clockStartedAt)

        return [
          ...payouts,
          {
            ...payout,
            id: `payout-${payout.partnerId}-${now.getTime()}`,
            recordedBy: s.role,
            recordedAt: now.toISOString(),
          },
        ]
      })
    },
    revokeReportLink: async ({ id }) => {
      setPartner(id, p =>
        p.reportToken
          ? {
              ...p,
              reportToken: null,
              revokedTokens: [...p.revokedTokens, p.reportToken],
            }
          : p)
    },
    issueReportLink: async ({ id, token }) => {
      setPartner(id, p => (p.reportToken ? p : { ...p, reportToken: token }))
    },
  }
}
