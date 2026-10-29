import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AUTOSAVE_MS, SAVE_MS, useStoryEditor } from '@/features/lab/story-editor-state'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('[E4.3] drafts save themselves', () => {
  it('saves 1.5 s after the last edit, with no Save button', () => {
    const { result } = renderHook(() => useStoryEditor('draft'))

    expect(result.current.save).toBe('saved')
    expect(result.current).not.toHaveProperty('saveDraft')

    act(() => result.current.patchVersion({ title: 'A new title' }))
    expect(result.current.save).toBe('unsaved')

    // A second edit before the wait is over starts the wait again.
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS - 100))
    act(() => result.current.patchVersion({ excerpt: 'A new excerpt' }))
    act(() => vi.advanceTimersByTime(AUTOSAVE_MS - 100))
    expect(result.current.save).toBe('unsaved')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current.save).toBe('saving')
    act(() => vi.advanceTimersByTime(SAVE_MS))
    expect(result.current.save).toBe('saved')
    expect(result.current.version.title).toBe('A new title')
  })

  it('marks a published version as having edits that are not live', () => {
    const { result } = renderHook(() => useStoryEditor('de'))

    expect(result.current.version.status).toBe('published')
    act(() => result.current.patchVersion({ title: 'Neu' }))
    expect(result.current.pending.de).toBe(true)
  })
})
