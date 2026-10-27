import type { ReactNode } from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect } from 'react'

import { AppProviders } from '@/app-providers'
import { AppToasts } from '@/components/app-toasts'
import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { RouteError } from '@/components/route-fallbacks'
import { useLocale } from '@/contexts/locale-context'
import { PrototypeBar, useStorageFull } from '@/features/demo'
import '@/styles/globals.css'

const fontsHref
  = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap'

const fontsScript = `document.head.appendChild(Object.assign(document.createElement('link'),{rel:'stylesheet',href:${JSON.stringify(fontsHref)}}))`

export const Route = createRootRoute({
  // The root renders the document shell on the server. A route is client-only unless it sets `ssr: true` (E3.3 turns the public routes on).
  ssr: true,
  head: () => ({
    meta: [
      { charSet: 'UTF-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
      { title: 'Swiss Keepsakes · Prototype' },
      {
        name: 'description',
        content: 'Clickable prototype of Swiss Keepsakes: keepsakes and tours from Luzerne makers. All data is mock data.',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      // The fonts must not block first paint: the browser fetches the stylesheet early (preload), and
      // `fontsScript` adds it as a stylesheet, which a script-inserted link never makes render-blocking.
      // `display=swap` in the address shows text in the fallback font until the fonts arrive. The
      // `<noscript>` link in the shell covers a browser without scripts.
      { rel: 'preload', as: 'style', href: fontsHref },
    ],
    scripts: [{ children: fontsScript }],
  }),
  shellComponent: RootShell,
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="swiss-keepsakes">
      <head>
        <HeadContent />
        <noscript>
          <link rel="stylesheet" href={fontsHref} />
        </noscript>
      </head>
      <body className="bg-background text-foreground">
        {/* The providers sit above the route boundaries, so RouteError and NotFound can use them. */}
        <AppProviders>{children}</AppProviders>
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const storageFull = useStorageFull()

  // Effects run after the commit, so the end-to-end specs wait on this to know React owns the page.
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  const isCalendarLab = useRouterState({
    select: state => state.location.pathname === '/lab/calendar',
  })

  return (
    // The prototype bar takes its own height; each shell fills the rest of the screen.
    <div className="flex min-h-dvh flex-col">
      {!isCalendarLab && <PrototypeBar />}
      <Outlet />
      <AppToasts storageFull={storageFull} />
    </div>
  )
}

function NotFound() {
  const { t } = useLocale()

  return (
    <div className="px-4 py-12">
      <EmptyState
        action={{ label: t('placeholder.backHome'), to: '/' }}
        icon={InfoIcon}
        message={t('notFound.message')}
      />
    </div>
  )
}
