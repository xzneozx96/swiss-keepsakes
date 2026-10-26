import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSeedState } from '@/features/demo/seed'
import { createDemoStore, updateWithinBudget } from '@/features/demo/store'

beforeEach(() => {
  window.localStorage.clear()
})

describe('demo store restore', () => {
  it('[E3.2] saves the restored state at once, so a first visit writes sk.demo', () => {
    const store = createDemoStore(createSeedState(), { persist: false })

    expect(window.localStorage.getItem('sk.demo')).toBeNull()
    store.restore(createSeedState())

    expect(window.localStorage.getItem('sk.demo')).not.toBeNull()
  })

  it('[E3.2] writes nothing before restore', () => {
    const store = createDemoStore(createSeedState(), { persist: false })

    store.save()

    expect(window.localStorage.getItem('sk.demo')).toBeNull()
  })
})

describe('demo store updates before restore', () => {
  const saved = () => {
    const base = createSeedState()

    return { ...base, role: 'guest' as const }
  }

  it('[E3.3] keeps an update made before restore and leaves the rest of the saved state', () => {
    const store = createDemoStore(createSeedState(), { persist: false })
    const savedState = saved()

    store.update(s => ({ ...s, role: 'owner' }))
    store.restore(savedState)

    expect(store.getState()).toEqual({ ...savedState, role: 'owner' })
  })

  it('[E3.3] replays queued updates in call order', () => {
    const store = createDemoStore(createSeedState(), { persist: false })
    const seen: string[] = []

    store.update((s) => {
      seen.push('first')

      return { ...s, role: 'owner' }
    })
    store.update((s) => {
      seen.push(`second after ${s.role}`)

      return { ...s, role: 'manager' }
    })
    store.restore(saved())

    expect(seen).toEqual(['first', 'second after owner'])
    expect(store.getState().role).toBe('manager')
  })

  it('[E3.3] keeps setRole made before restore', () => {
    const store = createDemoStore(createSeedState(), { persist: false })

    store.setRole('owner')
    store.restore(saved())

    expect(store.getState().role).toBe('owner')
  })

  it('[E3.3] does not change the state or write storage before restore', () => {
    const initial = createSeedState()
    const store = createDemoStore(initial, { persist: false })

    store.setRole('owner')

    expect(store.getState()).toBe(initial)
    expect(window.localStorage.getItem('sk.demo')).toBeNull()
  })

  it('[E3.3] applies an update at once after restore', () => {
    const store = createDemoStore(createSeedState(), { persist: false })

    store.restore(saved())
    store.setRole('owner')

    expect(store.getState().role).toBe('owner')
  })

  it('[E3.3] never queues in a persisting store', () => {
    const store = createDemoStore(createSeedState())

    store.setRole('owner')

    expect(store.getState().role).toBe('owner')
  })

  it('[E3.3] saves the replayed update with the restored state', () => {
    const store = createDemoStore(createSeedState(), { persist: false })

    store.update(s => ({ ...s, role: 'owner' }))
    store.restore(saved())

    expect(JSON.parse(window.localStorage.getItem('sk.demo') ?? '{}').role).toBe('owner')
  })

  it('[E3.3] a recipe that throws does not stop the others or later updates, and restore does not throw', () => {
    const store = createDemoStore(createSeedState(), { persist: false })
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    store.update(s => ({ ...s, role: 'owner' }))
    store.update(() => {
      throw new Error('bad recipe')
    })
    store.update(s => ({ ...s, role: s.role === 'owner' ? 'manager' : 'guest' }))

    expect(() => store.restore(saved())).not.toThrow()
    expect(store.getState().role).toBe('manager')
    expect(errors).toHaveBeenCalledTimes(1)

    store.setRole('owner')

    expect(store.getState().role).toBe('owner')
    errors.mockRestore()
  })
})

describe('budgeted update before restore', () => {
  it('[E3.3] applies on top of the restored data and does not overwrite it with a seed snapshot', () => {
    const store = createDemoStore(createSeedState(), { persist: false })
    const savedState = { ...createSeedState(), role: 'guest' as const }

    savedState.data = { ...savedState.data, guests: savedState.data.guests.slice(0, 1) }
    updateWithinBudget(store, s => ({ ...s, role: 'owner' }))
    store.restore(savedState)

    expect(store.getState().data.guests).toHaveLength(1)
    expect(store.getState().role).toBe('owner')
  })
})
