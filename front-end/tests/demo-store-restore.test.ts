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
