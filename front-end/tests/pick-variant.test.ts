import { describe, expect, it } from 'vitest'
import { pickVariant, widestVariant } from '@/lib/pick-variant'

const copies = [{ width: 320, url: 'a' }, { width: 640, url: 'b' }, { width: 1280, url: 'c' }]

describe('pickVariant', () => {
  it('gives the smallest copy at least that wide', () => {
    expect(pickVariant(copies, 100)?.url).toBe('a')
    expect(pickVariant(copies, 320)?.url).toBe('a')
    expect(pickVariant(copies, 321)?.url).toBe('b')
    expect(pickVariant(copies, 1280)?.url).toBe('c')
  })

  it('gives nothing when no copy is that wide, and nothing for no copies, so the caller picks its fallback', () => {
    expect(pickVariant(copies, 1281)).toBeUndefined()
    expect(pickVariant([], 100)).toBeUndefined()
  })

  it('sorts defensively, so copies that arrive widest first still give the smallest fit, and the input stays as it was', () => {
    const reversed = [...copies].reverse()

    expect(pickVariant(reversed, 400)?.url).toBe('b')
    expect(reversed.map(v => v.url)).toEqual(['c', 'b', 'a'])
  })
})

describe('widestVariant', () => {
  it('gives the widest copy whatever the order, and nothing for no copies', () => {
    expect(widestVariant(copies)?.url).toBe('c')
    expect(widestVariant([...copies].reverse())?.url).toBe('c')
    expect(widestVariant([])).toBeUndefined()
  })
})
