import type { CommissionAdjustment, Partner, PartnerPayout, ReferralVisit } from '@sk/domain/partners'
import type { DataClient } from '@/features/data-client'

import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { queryKeys, useDataClient } from '@/features/data-client'

export const partnersQueries = {
  partners: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.partners.partners,
      queryFn: client.partners.partners,
    }),
  referralVisits: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.partners.referralVisits,
      queryFn: client.partners.referralVisits,
    }),
  commissionAdjustments: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.partners.commissionAdjustments,
      queryFn: client.partners.commissionAdjustments,
    }),
  partnerPayouts: (client: DataClient) =>
    queryOptions({
      queryKey: queryKeys.partners.partnerPayouts,
      queryFn: client.partners.partnerPayouts,
    }),
}

export function usePartners<T = Partner[]>(
  select?: (partners: Partner[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...partnersQueries.partners(client), select }).data
}

export function useReferralVisits<T = ReferralVisit[]>(
  select?: (referralVisits: ReferralVisit[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...partnersQueries.referralVisits(client), select }).data
}

export function useCommissionAdjustments<T = CommissionAdjustment[]>(
  select?: (commissionAdjustments: CommissionAdjustment[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...partnersQueries.commissionAdjustments(client), select }).data
}

export function usePartnerPayouts<T = PartnerPayout[]>(
  select?: (partnerPayouts: PartnerPayout[]) => T,
): T {
  const client = useDataClient()

  return useSuspenseQuery({ ...partnersQueries.partnerPayouts(client), select }).data
}
