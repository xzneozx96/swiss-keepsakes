import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAutosave, NotSaved, STORY_AUTOSAVE_MS } from '@/features/stories/lib/autosave'

class Stale extends Error {}

function setup(save: (draft: string, ifMatch: number) => Promise<number>) {
  return createAutosave<string>({ version: 3, save, isStale: error => error instanceof Stale, onState: () => {} })
}

/** A write the test settles by hand. */
function deferredWrite() {
  const calls: { ifMatch: number, resolve: (value: { rowVersion: number }) => void, reject: (error: unknown) => void }[] = []
  const write = (ifMatch: number) => new Promise<{ rowVersion: number }>((resolve, reject) => calls.push({ ifMatch, resolve, reject }))

  return { calls, write }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('[E4.3][AC45] exclusive writes on the row version', () => {
  it('[E4.3][AC45] AC-5 exclusive runs the write with the current row version and the next save uses the version the write returned', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const engine = setup(save)
    const write = vi.fn(async (_ifMatch: number) => ({ rowVersion: 9 }))

    await expect(engine.exclusive(write)).resolves.toEqual({ rowVersion: 9 })
    expect(write).toHaveBeenCalledWith(3)
    engine.change('a')
    await engine.flush()
    expect(save).toHaveBeenCalledWith('a', 9)
  })

  it('[E4.3][AC45] exclusive flushes a pending edit first and runs the write with the version that save returned', async () => {
    const order: string[] = []
    const engine = setup(async (_draft, ifMatch) => {
      order.push(`save@${ifMatch}`)

      return ifMatch + 1
    })

    engine.change('a')
    await engine.exclusive(async (ifMatch) => {
      order.push(`write@${ifMatch}`)

      return { rowVersion: ifMatch + 1 }
    })
    expect(order).toEqual(['save@3', 'write@4'])
  })

  it('[E4.3][AC45] exclusive throws NotSaved and sends nothing when the pending save fails, and when the engine is stale', async () => {
    const write = vi.fn(async (ifMatch: number) => ({ rowVersion: ifMatch + 1 }))
    const failing = setup(async () => {
      throw new Error('boom')
    })

    failing.change('a')
    await expect(failing.exclusive(write)).rejects.toBeInstanceOf(NotSaved)
    const stale = setup(async () => {
      throw new Stale()
    })

    stale.change('a')
    await stale.flush()
    await expect(stale.exclusive(write)).rejects.toBeInstanceOf(NotSaved)
    expect(write).not.toHaveBeenCalled()
  })

  it('[E4.3][AC45] an edit made while the write runs is saved after it, never at the same time', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const engine = setup(save)
    const { calls, write } = deferredWrite()
    const done = engine.exclusive(write)

    await vi.advanceTimersByTimeAsync(0)
    engine.change('typed meanwhile')
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS * 2)
    expect(save).not.toHaveBeenCalled()
    calls[0]!.resolve({ rowVersion: 7 })
    await done
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('typed meanwhile', 7)
  })

  it('[E4.3][AC45] a stale rejection of the write puts the engine in stale and is rethrown', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const engine = setup(save)
    const failure = new Stale()

    await expect(engine.exclusive(async () => {
      throw failure
    })).rejects.toBe(failure)
    expect(engine.state()).toBe('stale')
    engine.change('a')
    await expect(engine.flush()).resolves.toBe(false)
    expect(save).not.toHaveBeenCalled()
  })

  it('[E4.3][AC45] two exclusive calls run one after the other', async () => {
    const engine = setup(async (_draft, ifMatch) => ifMatch + 1)
    const first = deferredWrite()
    const second = vi.fn(async (ifMatch: number) => ({ rowVersion: ifMatch + 1 }))
    const one = engine.exclusive(first.write)
    const two = engine.exclusive(second)

    await vi.advanceTimersByTimeAsync(0)
    expect(second).not.toHaveBeenCalled()
    first.calls[0]!.resolve({ rowVersion: 5 })
    await Promise.all([one, two])
    expect(second).toHaveBeenCalledWith(5)
  })
})
