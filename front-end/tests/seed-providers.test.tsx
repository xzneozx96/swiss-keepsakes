import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { LocaleProvider, useLocale } from '@/contexts/locale-context'
import { startSeedDemo } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'

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
    expect(first.store.getState().role).toBe('owner')
    expect(first.store.getInitialState().role).toBe('guest')
    first.store.setRole('guest')
    first.store.save()
    expect(JSON.parse(localStorage.getItem('sk.demo') ?? '{}').role).toBe('guest')
  })

  it('the saved language arrives after the first render, which is English', async () => {
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

    expect(seen[0]).toBe('en')
    await waitFor(() => expect(screen.getByText('de')).toBeInTheDocument())
  })
})
