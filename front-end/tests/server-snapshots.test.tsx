import { act, render } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { getServerMusic, setMusic, useMusic } from '@/components/background-music-store'
import { setShowProposals, useShowProposals } from '@/features/demo/proposals'
import { useSharedClock } from '@/hooks/use-shared-clock'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

describe('[E3.3] server snapshots of the module-level stores', () => {
  it('the shared clock renders the value it is given on the server, not the real time', () => {
    function Probe() {
      return <p>{useSharedClock(30_000, 1234)}</p>
    }

    expect(renderToString(<Probe />)).toContain('1234')
  })

  it('the music store gives the server the defaults, whatever this browser saved', () => {
    setMusic({ muted: true, level: 0.9, enabled: false })

    expect(getServerMusic()).toMatchObject({ muted: false, level: 0.35, enabled: true, stacked: 0 })
  })

  it('the proposals switch renders off on the server, whatever this browser saved', () => {
    setShowProposals(true)
    function Probe() {
      return <p>{`proposals:${useShowProposals()}`}</p>
    }

    expect(renderToString(<Probe />)).toContain('proposals:false')
    setShowProposals(false)
  })

  it('useMusic renders on the server', () => {
    function Probe() {
      return <p>{String(useMusic().sheetOpen)}</p>
    }

    expect(renderToString(<Probe />)).toContain('false')
  })
})

describe('[E3.3] a seed demo is ready to render at once', () => {
  it('every collection is in the query cache before any read, so the server HTML is the page and not a skeleton', async () => {
    const { startSeedDemo } = await import('@/features/demo/data-client')
    const { catalogQueries } = await import('@/features/catalog/api/queries')
    const { toursQueries } = await import('@/features/tours/api/queries')
    const { store, queryClient, dataClient } = startSeedDemo()

    expect(queryClient.getQueryData(catalogQueries.products(dataClient).queryKey)).toBe(store.getState().data.products)
    expect(queryClient.getQueryData(toursQueries.records(dataClient).queryKey)).toMatchObject({ tours: store.getState().data.tours?.tours })
  })

  it('a screen that suspends on a query renders its text on the server', async () => {
    const { startSeedDemo } = await import('@/features/demo/data-client')
    const { QueryClientProvider } = await import('@tanstack/react-query')
    const { DataClientProvider } = await import('@/features/data-client')
    const { useProducts } = await import('@/features/catalog/api/queries')
    const { Suspense } = await import('react')
    const demo = startSeedDemo()

    function Probe() {
      return <p>{`count:${useProducts().length}`}</p>
    }

    const html = renderToString(
      <QueryClientProvider client={demo.queryClient}>
        <DataClientProvider client={demo.dataClient}>
          <Suspense fallback={<p>skeleton</p>}>
            <Probe />
          </Suspense>
        </DataClientProvider>
      </QueryClientProvider>,
    )

    expect(html).toContain('count:')
    expect(html).not.toContain('skeleton')
  })
})

describe('[E3.3] useSimulatedLoading', () => {
  function Probe({ seen }: { seen: boolean[] }) {
    const loading = useSimulatedLoading()

    seen.push(loading)

    return <p>{loading ? 'skeleton' : 'page'}</p>
  }

  it('renders the page on the server', () => {
    expect(renderToString(<Probe seen={[]} />)).toContain('page')
  })

  it('hydrating server HTML, the first client render is the page too', async () => {
    const container = document.createElement('div')
    const seen: boolean[] = []
    const recoverable: unknown[] = []

    container.innerHTML = renderToString(<Probe seen={[]} />)
    await act(async () => {
      hydrateRoot(container, <Probe seen={seen} />, { onRecoverableError: error => recoverable.push(error) })
    })

    expect(seen[0]).toBe(false)
    expect(recoverable).toEqual([])
  })

  it('a client-side render with no server HTML still starts with the skeleton, then shows the page', async () => {
    vi.useFakeTimers()
    const seen: boolean[] = []

    render(<Probe seen={seen} />)
    expect(seen[0]).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(seen.at(-1)).toBe(false)
    vi.useRealTimers()
  })
})

describe('[E3.3] a restored seed demo', () => {
  it('holds the saved collection in the query cache, not the primed seed', async () => {
    const { startSeedDemo } = await import('@/features/demo/data-client')
    const { createSeedState } = await import('@/features/demo/seed')
    const { catalogQueries } = await import('@/features/catalog/api/queries')
    const seed = createSeedState()
    const saved = { ...seed, data: { ...seed.data, products: seed.data.products.slice(0, 2) } }

    localStorage.setItem('sk.demo', JSON.stringify(saved))
    const { queryClient, dataClient, restore } = startSeedDemo()
    const key = catalogQueries.products(dataClient).queryKey

    expect(queryClient.getQueryData(key)).toHaveLength(seed.data.products.length)
    await restore()

    expect(queryClient.getQueryData(key)).toHaveLength(2)
    localStorage.clear()
  })
})
