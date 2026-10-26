import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { useCommand } from '@/features/data-client'
import { usePartners } from '@/features/partners/api/queries'
import { partnerByCode } from '@/features/partners/referral'
import { noIndexHead } from '@/lib/no-index'

/**
 * Public referral link /r/{code} (UX spec §3.1, §4.1): records the visit, then shows the
 * discovery home. Nothing on screen says the guest was referred.
 */
export const Route = createFileRoute('/r/$code')({
  ssr: false,
  head: noIndexHead,
  component: ReferralLink,
})

function ReferralLink() {
  const { code } = Route.useParams()
  const { mutate: recordVisit } = useCommand('partners', 'recordVisit')
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
