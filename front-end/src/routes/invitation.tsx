import { createFileRoute } from '@tanstack/react-router'

import { InvitationScreen } from '@/features/stores/components/invitation-screen'
import { noIndexHead } from '@/lib/no-index'

// M01 Accept an invitation (Store Manager). Outside the shop shell: the invitee has no store yet. The invitation
// token is taken off the address before the router starts (`captureInvitations`; E3.4 wires it into the Start entry), so this route reads no search parameter.
export const Route = createFileRoute('/invitation')({
  ssr: false,
  head: noIndexHead,
  component: InvitationScreen,
})
