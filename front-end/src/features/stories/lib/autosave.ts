export const STORY_AUTOSAVE_MS = 1500

export type AutosaveState = 'saved' | 'unsaved' | 'saving' | 'stale' | 'failed'

export interface Autosave<D> {
  /** Holds the draft, state unsaved (not after stale), and restarts the wait. */
  change: (draft: D) => void
  /** Saves now. Resolves true when nothing is left unsaved; false while stale or after a failure. */
  flush: () => Promise<boolean>
  /** Drops the pending draft and the timer. Sends nothing. */
  discard: () => void
  /** Clears the timer and saves a pending draft (leaving a screen keeps what was typed). */
  dispose: () => void
  state: () => AutosaveState
}

/**
 * The autosave of the story editor, without React so fake timers can test it. The draft is held here, never in a query,
 * so a refetch cannot move a caret. One save runs at a time: each needs the row version the last answer returned, so an
 * edit made during a run makes the run go round again. A stale answer (412) blocks every later save until a new engine is
 * made, which is what a reload does.
 */
export function createAutosave<D>({ version, delayMs = STORY_AUTOSAVE_MS, save, isStale, onState }: {
  /** The row version the page loaded. */
  version: number
  delayMs?: number
  /** Resolves the new row version; rejects with an error. */
  save: (draft: D, ifMatch: number) => Promise<number>
  isStale: (error: unknown) => boolean
  onState: (state: AutosaveState, error?: unknown) => void
}): Autosave<D> {
  let rowVersion = version
  let pending: D | undefined
  let dirty = false
  let stale = false
  let state: AutosaveState = 'saved'
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | undefined

  const set = (next: AutosaveState, error?: unknown) => {
    state = next
    onState(next, error)
  }

  async function run(): Promise<boolean> {
    while (dirty) {
      const sent = pending as D

      dirty = false
      set('saving')
      try {
        rowVersion = await save(sent, rowVersion)
      }
      catch (error) {
        dirty = true
        stale = isStale(error)
        set(stale ? 'stale' : 'failed', error)

        return false
      }
    }
    set('saved')

    return true
  }

  function flush(): Promise<boolean> {
    clearTimeout(timer)
    if (running)
      return running
    // A stale draft is not saved again until the page is reloaded.
    if (stale)
      return Promise.resolve(false)
    if (!dirty)
      return Promise.resolve(true)
    const started = run()

    running = started
    void started.finally(() => {
      if (running === started)
        running = undefined
    })

    return started
  }

  return {
    change(draft) {
      pending = draft
      dirty = true
      clearTimeout(timer)
      if (stale)
        return
      set('unsaved')
      timer = setTimeout(() => void flush(), delayMs)
    },
    flush,
    discard() {
      clearTimeout(timer)
      pending = undefined
      dirty = false
    },
    dispose() {
      clearTimeout(timer)
      if (dirty)
        void flush()
    },
    state: () => state,
  }
}
