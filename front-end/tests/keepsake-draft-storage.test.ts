import { beforeEach, describe, expect, it } from 'vitest'

import { readDraft } from '@/features/keepsakes/lib/draft-storage'

const store = '0198a000-0000-7000-8000-000000000001'

function stored(over: Record<string, unknown>) {
  return sessionStorage.setItem(`sk:new-keepsake:${store}`, JSON.stringify({
    value: { name: { en: 'Knife', de: '' }, text: { en: null, de: null } },
    photoIds: [],
    commission: 0,
    options: [],
    variants: [],
    step: 'details',
    reached: 0,
    ...over,
  }))
}

describe('[T-008] a new keepsake that a reload brings back', () => {
  beforeEach(() => sessionStorage.clear())

  it('[T-008][AC1] a draft saved on the old Variants step comes back on the merged step, and none is past Review', () => {
    stored({ step: 'variants', reached: 2 })
    expect(readDraft(store)).toMatchObject({ step: 'options', reached: 2 })
    stored({ step: 'review', reached: 3 })
    expect(readDraft(store)).toMatchObject({ step: 'review', reached: 2 })
  })

  it('[T-008] a draft on the steps that stay is left as it was', () => {
    stored({ step: 'options', reached: 1 })
    expect(readDraft(store)).toMatchObject({ step: 'options', reached: 1 })
  })
})
