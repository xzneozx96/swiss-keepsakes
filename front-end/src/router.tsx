import { createRouter } from '@tanstack/react-router'

import { RoutePending } from '@/components/route-fallbacks'
import { routeTree } from '@/routeTree.gen'

/** Start calls this once per request on the server and once in the browser. */
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // A screen whose query suspends shows a skeleton instead of blanking the app. A failed one shows
    // the root route's error screen; one boundary there, not one per route, which re-rendered on
    // every search change.
    defaultPendingComponent: RoutePending,
    disableGlobalCatchBoundary: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
  interface StaticDataRouteOption {
    /** Detail screens with their own bottom action bar hide the guest tab bar (native pattern). */
    hideTabBar?: boolean
    /** The screen reserves room for its own bottom bar; the guest shell adds no bottom padding. */
    ownsBottomSpace?: boolean
  }
}
