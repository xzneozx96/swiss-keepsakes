import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { queryKeys, useCommand, useDataClient } from '@/features/data-client'
import { usePartners } from '@/features/partners/api/queries'
import { partnerByCode } from '@/features/partners/referral'

/**
 * Public referral link /r/{code} (UX spec §3.1, §4.1): records the visit, then shows the
 * discovery home. Nothing on screen says the guest was referred.
 */
export const Route = createFileRoute('/r/$code')({ component: ReferralLink })

function ReferralLink() {
  const { code } = Route.useParams()
  const client = useDataClient()
  const { mutate: recordVisit } = useCommand(client.partners.recordVisit, [
    queryKeys.partners.referralVisits,
  ])
  const demoPartners = usePartners()
  const recordedRef = useRef(false)

  useEffect(() => {
    if (recordedRef.current)
      return
    recordedRef.current = true

    const partner = partnerByCode(demoPartners, code)

    // An archived partner's QR still opens the shop, but no longer credits the visit (D17).
    if (!partner || partner.archivedAt)
      return
    recordVisit({ partnerId: partner.id })
  }, [code, demoPartners, recordVisit])

  return <Navigate replace to="/" />
}
