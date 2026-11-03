import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAutosave, STORY_AUTOSAVE_MS } from '@/features/stories/lib/autosave'

class Stale extends Error {}

function setup(save: (draft: string, ifMatch: number) => Promise<number>) {
  const states: string[] = []
  const engine = createAutosave<string>({
    version: 3,
    save,
    isStale: error => error instanceof Stale,
    onState: state => states.push(state),
  })

  return { engine, states }
}

/** A save the test settles by hand. */
function deferred() {
  const calls: { draft: string, ifMatch: number, resolve: (version: number) => void, reject: (error: unknown) => void }[] = []
  const save = (draft: string, ifMatch: number) => new Promise<number>((resolve, reject) => calls.push({ draft, ifMatch, resolve, reject }))

  return { calls, save }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('[E4.3][AC45] the autosave engine', () => {
  it('[E4.3][AC45] AC-1 saves 1.5 s after the last edit with the row version, and the next save uses the version it returned', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const { engine, states } = setup(save)

    engine.change('a')
    expect(engine.state()).toBe('unsaved')
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS - 1)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledWith('a', 3)
    expect(engine.state()).toBe('saved')
    engine.change('b')
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS)
    expect(save).toHaveBeenLastCalledWith('b', 4)
    expect(states).toEqual(['unsaved', 'saving', 'saved', 'unsaved', 'saving', 'saved'])
  })

  it('[E4.3][AC45] a second edit before the wait is over restarts the wait', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const { engine } = setup(save)

    engine.change('a')
    await vi.advanceTimersByTimeAsync(1000)
    engine.change('ab')
    await vi.advanceTimersByTimeAsync(1000)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('ab', 3)
  })

  it('[E4.3][AC45] AC-1 flush saves at once and resolves true', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const { engine } = setup(save)

    engine.change('a')
    await expect(engine.flush()).resolves.toBe(true)
    expect(save).toHaveBeenCalledWith('a', 3)
    await expect(engine.flush()).resolves.toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('[E4.3][AC45] an edit during a running save saves again after it, with the new version, never two saves at once', async () => {
    const { calls, save } = deferred()
    const { engine } = setup(save)

    engine.change('a')
    const done = engine.flush()

    expect(calls).toHaveLength(1)
    engine.change('ab')
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS * 2)
    expect(calls).toHaveLength(1)
    calls[0]!.resolve(4)
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toHaveLength(2)
    expect(calls[1]).toMatchObject({ draft: 'ab', ifMatch: 4 })
    calls[1]!.resolve(5)
    await expect(done).resolves.toBe(true)
    expect(engine.state()).toBe('saved')
  })

  it('[E4.3][AC45] AC-2 a stale answer stops saving, keeps the draft dirty, and flush then sends nothing and resolves false', async () => {
    const save = vi.fn(async () => {
      throw new Stale('412')
    })
    const { engine } = setup(save)

    engine.change('a')
    await expect(engine.flush()).resolves.toBe(false)
    expect(engine.state()).toBe('stale')
    engine.change('ab')
    expect(engine.state()).toBe('stale')
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS * 2)
    await expect(engine.flush()).resolves.toBe(false)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('[E4.3][AC45] a failed save keeps the edit, state failed, and flush retries it', async () => {
    const save = vi.fn<(draft: string, ifMatch: number) => Promise<number>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(4)
    const { engine } = setup(save)

    engine.change('a')
    await expect(engine.flush()).resolves.toBe(false)
    expect(engine.state()).toBe('failed')
    await expect(engine.flush()).resolves.toBe(true)
    expect(save).toHaveBeenLastCalledWith('a', 3)
    expect(engine.state()).toBe('saved')
  })

  it('[E4.3][AC45] AC-3 discard drops the pending edit and sends nothing, dispose after discard sends nothing, dispose with a pending edit flushes it', async () => {
    const save = vi.fn(async (_draft: string, ifMatch: number) => ifMatch + 1)
    const first = setup(save)

    first.engine.change('a')
    first.engine.discard()
    await vi.advanceTimersByTimeAsync(STORY_AUTOSAVE_MS * 2)
    first.engine.dispose()
    expect(save).not.toHaveBeenCalled()
    const second = setup(save)

    second.engine.change('b')
    second.engine.dispose()
    await vi.advanceTimersByTimeAsync(0)
    expect(save).toHaveBeenCalledWith('b', 3)
  })
})
