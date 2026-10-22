import { describe, expect, it } from 'vitest'

import { slugFromName } from '@/features/stores/lib/slug'

describe('[E2.3] the store slug from its name', () => {
  it.each([
    ['Chị Ngọc Keepsakes', 'chi-ngoc-keepsakes'],
    ['  Café  Zürich!  ', 'cafe-zurich'],
    ['Đà Lạt', 'da-lat'],
    ['!!', ''],
  ])('turns %j into %j', (name, slug) => {
    expect(slugFromName(name)).toBe(slug)
  })

  it('stays within 60 characters and never ends in a dash', () => {
    const slug = slugFromName(`${'a'.repeat(59)} b`)

    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })
})
