import { createFileRoute } from '@tanstack/react-router'

import { MapScreen } from '@/features/map/components/map-screen'

// N02 guest map. The shell is server-rendered, the pins load in the browser (ADR-006); the screen fills the space above the tab bar.
export const Route = createFileRoute('/_guest/$lang/map')({
  ssr: true,
  staticData: { ownsBottomSpace: true },
  component: MapScreen,
})
