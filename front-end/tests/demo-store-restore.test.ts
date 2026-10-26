import { beforeEach, describe, expect, it } from 'vitest'

import { createSeedState } from '@/features/demo/seed'
import { createDemoStore } from '@/features/demo/store'

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
})
