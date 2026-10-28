import { describe, expect, it } from 'vitest'
import { createFakeStorage } from '../support/fake-storage.ts'
import { createManualClock } from '../support/manual-clock.ts'

describe('[E2.7] fake storage', () => {
  it('[E2.7] keeps objects per bucket, stamps lastModified from the clock, and lists by prefix', async () => {
    const clock = createManualClock(new Date('2026-10-01T10:00:00Z'))
    const storage = createFakeStorage(clock)

    await storage.put('uploads', 'a/1.png', new Uint8Array([1, 2]), { contentType: 'image/png' })
    clock.advance(60_000)
    storage.seed('uploads', 'b/2.png', new Uint8Array([3]))

    expect(await storage.head('uploads', 'a/1.png')).toEqual({ key: 'a/1.png', size: 2, contentType: 'image/png', lastModified: new Date('2026-10-01T10:00:00Z') })
    expect((await storage.list('uploads', 'a/')).map(o => o.key)).toEqual(['a/1.png'])
    expect(await storage.get('media', 'a/1.png')).toBeUndefined()
    await storage.delete('uploads', 'a/1.png')
    await storage.delete('uploads', 'a/1.png')
    expect(storage.objects('uploads').size).toBe(1)
    expect(storage.publicUrl('k.jpg')).toBe('https://storage.test/media/k.jpg')
    expect((await storage.presignPut({ key: 'k', contentType: 'image/png', byteSize: 1, expiresInSeconds: 900 })).url).toContain('/uploads/k')
  })

  it('[E2.7] list sorts by key and leaves contentType undefined, as the S3 adapter does', async () => {
    const storage = createFakeStorage(createManualClock(new Date('2026-10-01T10:00:00Z')))
    await storage.put('uploads', 'p/b', new Uint8Array([1]), { contentType: 'image/png' })
    await storage.put('uploads', 'p/a', new Uint8Array([1]), { contentType: 'image/png' })

    const listed = await storage.list('uploads', 'p/')

    expect(listed.map(o => o.key)).toEqual(['p/a', 'p/b'])
    expect(listed.every(o => o.contentType === undefined)).toBe(true)
  })
})
