import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import {
  loadDictionary,
  LocaleProvider,
  storedLanguage,
} from '@/contexts/locale-context'
import { followSession } from '@/features/auth/lib/session-sync'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startSeedDemo } from '@/features/demo/data-client'
import { apiEnabled } from '@/lib/api-mode'

type Demo = ReturnType<typeof startSeedDemo>

// Restoring starts in an effect, which runs only in the browser; each demo restores once, even if React
// runs the effect twice.
const restoring = new WeakMap<Demo, Promise<void>>()

function restoreOnce(demo: Demo): Promise<void> {
  const started = restoring.get(demo) ?? (
    // Whoever saved German waits for its chunk before the first paint; everyone else already has English.
    // If German cannot be fetched the app still starts, in English. If a demo collection cannot be
    // read, the app still starts too: its screen reads it again and shows RouteError if that fails.
    Promise.all([
      loadDictionary(storedLanguage()).catch(() => undefined),
      demo.restore().catch((error: unknown) =>
        console.error('A demo collection could not be read', error),
      ),
    ]).then(() => {
      // The first paint never waits for the session: the app renders signed out, and the store changes when
      // the API answers.
      if (apiEnabled)
        followSession(demo.store, demo.queryClient)
    })
  )

  restoring.set(demo, started)

  return started
}

/**
 * The providers for the whole app. Their first render is the same on the server and in the browser: a seed
 * demo store, English and no storage. A route that renders on the server (`ssr: true`) shows at once. Once
 * the page is in the browser the saved state and language replace the seed, and a client-only route waits
 * for them, then renders.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const rendersOnServer = useRouterState({
    select: state => state.matches.every(match => match.ssr === true),
  })
  // The initializer runs once per server request, and once in the browser.
  const [demo] = useState(startSeedDemo)
  const [restored, setRestored] = useState(false)
  // Once a server-rendered page is on screen it stays mounted, also when the guest moves on to a
  // client-only route before the saved state has loaded.
  const [shown, setShown] = useState(rendersOnServer)

  if (rendersOnServer && !shown)
    setShown(true)

  useEffect(() => {
    let current = true
    void restoreOnce(demo).then(() => {
      if (current)
        setRestored(true)
    })
    return () => {
      current = false
    }
  }, [demo])

  if (!restored && !shown)
    return null

  return (
    <QueryClientProvider client={demo.queryClient}>
      <DataClientProvider client={demo.dataClient}>
        <LocaleProvider>
          <DemoProvider store={demo.store}>{children}</DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>
  )
}
