import { createFileRoute } from '@tanstack/react-router'

import { InvitationScreen } from '@/features/stores/components/invitation-screen'

// M01 Accept an invitation (Store Manager). Outside the shop shell: the invitee has no store yet. The invitation
// token is taken off the address before the router starts (main.tsx), so this route reads no search parameter.
export const Route = createFileRoute('/invitation')({ component: InvitationScreen })
