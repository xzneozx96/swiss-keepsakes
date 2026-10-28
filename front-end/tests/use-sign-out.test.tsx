import type { ReactNode } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { lastPublicPath, rememberPublicPath } from '@/components/layout/last-public-path'
import { LocaleProvider } from '@/contexts/locale-context'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  localStorage.clear()
  demo = startDemo()
  await demo.ready
})

function Providers({ children }: { children: ReactNode }) {
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

describe('sign out and the remembered public page', () => {
  it('forgets the remembered public path once the session has ended', async () => {
    rememberPublicPath('/en/gifts?sort=new')
    const hook = renderHook(() => useSignOut(), { wrapper: Providers })

    await act(async () => hook.result.current.signOut())

    expect(lastPublicPath()).toBeNull()
  })
})
