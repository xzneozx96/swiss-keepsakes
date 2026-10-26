import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { getServerMusic, setMusic, useMusic } from '@/components/background-music-store'
import { setShowProposals, useShowProposals } from '@/features/demo/proposals'
import { useSharedClock } from '@/hooks/use-shared-clock'

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
