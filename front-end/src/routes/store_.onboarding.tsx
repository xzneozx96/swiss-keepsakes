import { createFileRoute } from '@tanstack/react-router'

import { OnboardingScreen } from '@/features/stores/components/onboarding-screen'

// A02 Open your store (invited Owner). The `_` after `store` keeps it out of the shop shell, which an Owner
// whose store is not open yet has no use for. The invitation token is taken off the address before the router
// starts (`captureInvitations`; E3.4 wires it into the Start entry), so this route reads no search parameter.
export const Route = createFileRoute('/store_/onboarding')({ component: OnboardingScreen })
