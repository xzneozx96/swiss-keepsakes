import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { loadDictionary, LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { startDemo } from '@/features/demo/data-client'
import { useSalesOverview } from '@/features/merchant/sales/hooks/use-sales-overview'

/** Every string value of a view, not its field names. */
function strings(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]
  if (Array.isArray(value))
    return value.flatMap(strings)
  if (value && typeof value === 'object')
    return Object.values(value).flatMap(strings)

  return []
}

let demo: ReturnType<typeof startDemo>

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  demo = startDemo()
  await demo.ready
})

describe('sales overview copy', () => {
  it.each(['en', 'de'] as const)('[E3.1][AC50] cards name no tours or bookings (%s)', async (language) => {
    await loadDictionary(language)
    localStorage.setItem('sk.language', language)
    const { result } = renderHook(() => useSalesOverview('28d', null), {
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
    const copy = strings({ kpis: result.current.kpis, mix: result.current.mix })

    expect(result.current.kpis.length).toBeGreaterThan(3)
    expect(copy.filter(c => /Tours|Touren|bookings|Buchung/i.test(c))).toEqual([])
  })
})
