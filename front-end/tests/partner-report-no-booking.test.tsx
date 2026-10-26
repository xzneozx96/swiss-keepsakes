import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { usePartnerOverview } from '@/features/partners/report/hooks/use-partner-overview'

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

describe('partner report', () => {
  it('[E3.1][AC50] overview builds with keepsakes only and lists no tours part', async () => {
    const { result } = renderHook(() => usePartnerOverview('hotel-am-see', '28d', null), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={demo.queryClient}>
          <DataClientProvider client={demo.dataClient}>
            <LocaleProvider>
              <DemoProvider store={demo.store}>{children}</DemoProvider>
            </LocaleProvider>
          </DataClientProvider>
        </QueryClientProvider>
      ),
    })

    await waitFor(() => expect(result.current).toBeTruthy())
    expect(result.current.mix.parts.map(p => p.id)).toEqual(['keepsakes'])
    expect(result.current.mix.parts.every(p => typeof p.orders === 'string')).toBe(true)
  })
})
