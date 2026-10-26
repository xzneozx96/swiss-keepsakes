import { createFileRoute } from '@tanstack/react-router'

import { PrivateTourRequest } from '@/features/requests/components/private-tour-request'

// C22 Private tour request: the entry below the C08 list opens it. A static segment, so it
// wins over `/tours/$slug`; no tour may use the slug `private-tour`.
export const Route = createFileRoute('/_guest/tours/private-tour')({
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: PrivateTourRequest,
})
