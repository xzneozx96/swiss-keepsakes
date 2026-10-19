import { QueryClientProvider } from '@tanstack/react-query'
import {
  createHashHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { RoutePending } from '@/components/route-fallbacks'
import {
  loadDictionary,
  LocaleProvider,
  storedLanguage,
} from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { routeTree } from '@/routeTree.gen'
import '@/styles/globals.css'

// Hash history: the prototype is served as static files with no server rewrites,
// so deep links and reloads (e.g. #/merchant/orders) must not hit the server.
const router = createRouter({
  routeTree,
  history: createHashHistory(),
  scrollRestoration: true,
  defaultPreload: 'intent',
  // A screen whose query suspends shows a skeleton instead of blanking the app. A failed one shows
  // the root route's error screen; one boundary there, not one per route, which re-rendered on
  // every search change.
  defaultPendingComponent: RoutePending,
  disableGlobalCatchBoundary: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    /** Detail screens with their own bottom action bar hide the guest tab bar (native pattern). */
    hideTabBar?: boolean
    /** The screen reserves room for its own bottom bar; the guest shell adds no bottom padding. */
    ownsBottomSpace?: boolean
  }
}

const rootElement = document.getElementById('root')!

if (!rootElement.innerHTML) {
  const demo = startDemo()

  // Whoever saved German waits for its chunk before the first paint; everyone else already has English.
  // If German cannot be fetched the app still starts, in English. If a demo collection cannot be
  // read, the app still starts too: its screen reads it again and shows RouteError if that fails.
  void Promise.all([
    loadDictionary(storedLanguage()).catch(() => undefined),
    demo.ready.catch((error: unknown) =>
      console.error('A demo collection could not be read', error),
    ),
  ]).then(() => {
    ReactDOM.createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={demo.queryClient}>
          <DataClientProvider client={demo.dataClient}>
            <LocaleProvider>
              <DemoProvider store={demo.store}>
                <RouterProvider router={router} />
              </DemoProvider>
            </LocaleProvider>
          </DataClientProvider>
        </QueryClientProvider>
      </StrictMode>,
    )
  })
}
