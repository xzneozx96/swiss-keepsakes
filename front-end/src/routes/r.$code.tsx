import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { useDemoActions, useDemoSelector } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { partnerByCode } from '@/features/partners/referral'

/**
 * Public referral link /r/{code} (UX spec §3.1, §4.1): records the visit, then shows the
 * discovery home. Nothing on screen says the guest was referred.
 */
export const Route = createFileRoute('/r/$code')({ component: ReferralLink })

function ReferralLink() {
  const { code } = Route.useParams()
  const { update } = useDemoActions()
  const demoPartners = useDemoSelector(s => s.data.partners)
  const recordedRef = useRef(false)

  useEffect(() => {
    if (recordedRef.current)
      return
    recordedRef.current = true

    const partner = partnerByCode(demoPartners, code)

    // An archived partner's QR still opens the shop, but no longer credits the visit (D17).
    if (!partner || partner.archivedAt)
      return
    update(s => ({
      ...s,
      data: {
        ...s.data,
        referralVisits: [
          ...s.data.referralVisits,
          {
            partnerId: partner.id,
            at: demoNow(s.clockStartedAt).toISOString(),
          },
        ],
      },
    }))
  }, [code, demoPartners, update])

  return <Navigate replace to="/" />
}
