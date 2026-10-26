import type { ReactNode } from 'react'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'

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

export const Route = createRootRoute({
  // Only the root renders on the server (the document shell); every other route stays client-only.
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
      // `display=swap` in the address shows text in the fallback font until the fonts arrive.
      { rel: 'stylesheet', href: fontsHref },
    ],
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
      </head>
      <body className="bg-background text-foreground">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  return (
    <AppProviders>
      <RootContent />
    </AppProviders>
  )
}

function RootContent() {
  const storageFull = useStorageFull()
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
