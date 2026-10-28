import { describe, expect, it } from 'vitest'
import { lastPublicPath, rememberPublicPath } from '@/components/layout/last-public-path'

describe('last public path', () => {
  it('is empty until a path is remembered, then returns the latest one', () => {
    expect(lastPublicPath()).toBeNull()
    rememberPublicPath('/en/stories/musegg-morning')
    rememberPublicPath('/en/gifts?sort=new')
    expect(lastPublicPath()).toBe('/en/gifts?sort=new')
  })
})
