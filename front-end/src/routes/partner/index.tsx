import { createFileRoute, Navigate } from '@tanstack/react-router'

import { PartnerShell } from '@/components/layout/partner-shell'
import { useDemoSelector } from '@/features/demo'
import { PartnerAccessScreen } from '@/features/partners/access/partner-access-screen'
import { usePartners } from '@/features/partners/api/queries'

// /partner, the prototype bar's Partner role: the report link of the partner last verified on
// this browser, else Hotel am See's current link (outline §3).
export const Route = createFileRoute('/partner/')({ component: PartnerHome })

function PartnerHome() {
  const partners = usePartners()
  const partnerSessions = useDemoSelector(s => s.data.partnerSessions)
  const latest = [...partnerSessions]
    .sort((a, b) => Date.parse(b.verifiedAt) - Date.parse(a.verifiedAt))
    .find(s =>
      partners.some(p => p.reportToken === s.token && !p.archivedAt),
    )
  const token
    = latest?.token ?? partners.find(p => p.id === 'hotel-am-see')?.reportToken

  if (!token) {
    return (
      <PartnerShell>
        <PartnerAccessScreen access={{ kind: 'invalid' }} />
      </PartnerShell>
    )
  }

  return (
    <Navigate replace params={{ token }} search={{}} to="/partner/$token" />
  )
}
