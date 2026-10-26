import type { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import {
  loadDictionary,
  LocaleProvider,
  storedLanguage,
} from '@/contexts/locale-context'
import { followSession } from '@/features/auth/lib/session-sync'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { apiEnabled } from '@/lib/api-mode'

type Demo = ReturnType<typeof startDemo>

// The demo store and the saved-language dictionary start once, in the browser.
let booting: Promise<Demo> | undefined

function boot() {
  booting ??= (() => {
    const demo = startDemo()
    // Whoever saved German waits for its chunk before the first paint; everyone else already has English.
    // If German cannot be fetched the app still starts, in English. If a demo collection cannot be
    // read, the app still starts too: its screen reads it again and shows RouteError if that fails.
    return Promise.all([
      loadDictionary(storedLanguage()).catch(() => undefined),
      demo.ready.catch((error: unknown) =>
        console.error('A demo collection could not be read', error),
      ),
    ]).then(() => {
      // The first paint never waits for the session: the app renders signed out, and the store changes when
      // the API answers.
      if (apiEnabled)
        followSession(demo.store, demo.queryClient)
      return demo
    })
  })()
  return booting
}

/** Task 2 makes this server-safe. For now the server and the first client render show nothing. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState<Demo>()

  useEffect(() => {
    let current = true
    void boot().then((started) => {
      if (current)
        setDemo(started)
    })
    return () => {
      current = false
    }
  }, [])

  if (!demo)
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
