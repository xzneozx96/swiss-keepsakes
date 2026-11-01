import { describe, expect, it } from 'vitest'

import { mapLimit } from '@/lib/map-limit'

describe('mapLimit', () => {
  it('never runs more than the limit at once, keeps the order and settles every item', async () => {
    let running = 0
    let peak = 0
    const results = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++
      peak = Math.max(peak, running)
      await new Promise(resolve => setTimeout(resolve, 5))
      running--
      if (n === 4)
        throw new Error('four')

      return n * 2
    })

    expect(peak).toBe(3)
    expect(results.map(result => (result.status === 'fulfilled' ? result.value : 'failed'))).toEqual([2, 4, 6, 'failed', 10, 12, 14])
  })

  it('an empty list settles at once', async () => {
    expect(await mapLimit([], 4, async () => 1)).toEqual([])
  })
})
