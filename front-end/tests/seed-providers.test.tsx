import { act, render, waitFor } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadDictionary, LocaleProvider, useLocale } from '@/contexts/locale-context'
import { startSeedDemo } from '@/features/demo/data-client'
import { createSeedState, DEMO_VERSION } from '@/features/demo/seed'

beforeEach(() => {
  localStorage.clear()
})

describe('[E3.2] the providers on the server and in the first render', () => {
  it('a seed demo ignores the saved state, never writes it and makes a store of its own each time', async () => {
    const saved = { ...createSeedState(), role: 'owner' as const }

    localStorage.setItem('sk.demo', JSON.stringify(saved))
    const first = startSeedDemo()
    const second = startSeedDemo()

    expect(first.store.getState().role).toBe('guest')
    expect(first.store).not.toBe(second.store)
    first.store.update(s => ({ ...s, role: 'manager' }))
    first.store.save()
    expect(JSON.parse(localStorage.getItem('sk.demo') ?? '{}').role).toBe('owner')

    await first.restore()
    // The update made before the restore replays on top of the saved state (E3.3).
    expect(first.store.getState().role).toBe('manager')
    expect(first.store.getInitialState().role).toBe('guest')
    first.store.setRole('guest')
    first.store.save()
    expect(JSON.parse(localStorage.getItem('sk.demo') ?? '{}').role).toBe('guest')
  })

  it('[E3.3] corrupt saved data still finishes the restore: seed state, saving on, error logged', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    localStorage.setItem('sk.demo', JSON.stringify({ version: DEMO_VERSION, data: null }))
    const demo = startSeedDemo()

    demo.store.setRole('owner')
    await demo.restore()

    expect(errors).toHaveBeenCalled()
    // The update made before the restore replays on the seed, and the store now saves.
    expect(demo.store.getState().role).toBe('owner')
    expect(JSON.parse(localStorage.getItem('sk.demo') ?? '{}').role).toBe('owner')
    demo.store.setRole('manager')
    demo.store.save()
    expect(JSON.parse(localStorage.getItem('sk.demo') ?? '{}').role).toBe('manager')
    errors.mockRestore()
  })

  it('hydrating server HTML, the provider starts in English although German is saved and loaded, then switches', async () => {
    await loadDictionary('de')
    const seen: string[] = []
    const recoverable: unknown[] = []

    function Probe() {
      const { language } = useLocale()

      seen.push(language)

      return <p>{language}</p>
    }
    const app = (
      <LocaleProvider>
        <Probe />
      </LocaleProvider>
    )
    // The server has no storage: it renders English.
    const container = document.createElement('div')

    localStorage.setItem('sk.language', '"de"')
    container.innerHTML = renderToString(app)
    seen.length = 0
    expect(container.textContent).toBe('en')

    document.body.append(container)
    let root!: ReturnType<typeof hydrateRoot>

    act(() => {
      root = hydrateRoot(container, app, { onRecoverableError: error => recoverable.push(error) })
    })

    // The first render while hydrating must equal the server's HTML, or React throws the page away and rebuilds it.
    expect(seen[0]).toBe('en')
    await waitFor(() => expect(container.textContent).toBe('de'))
    expect(recoverable).toEqual([])
    act(() => root.unmount())
    container.remove()
  })

  it('a client-only render starts in the saved language when its messages are loaded', async () => {
    await loadDictionary('de')
    localStorage.setItem('sk.language', '"de"')
    const seen: string[] = []

    function Probe() {
      const { language } = useLocale()

      seen.push(language)

      return <p>{language}</p>
    }

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    )

    expect(seen[0]).toBe('de')
  })
})
