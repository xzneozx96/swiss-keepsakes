import { StartClient } from '@tanstack/react-start/client'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

import { captureInvitations } from '@/features/stores/lib/invitation-token'

// Start's default client entry plus one call: the invitation token leaves the address before the router reads it.
// `StartClient` builds the router when it renders, after this line, though imports are hoisted.
captureInvitations()

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})
