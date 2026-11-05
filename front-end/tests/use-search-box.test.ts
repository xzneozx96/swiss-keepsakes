import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SEARCH_DELAY_MS, useSearchBox } from '@/hooks/use-search-box'

describe('useSearchBox', () => {
  it('commits the typed text once, a moment after the last key', () => {
    vi.useFakeTimers()
    const commit = vi.fn()
    const { result } = renderHook(() => useSearchBox('', commit))

    act(() => result.current[1]('wa'))
    act(() => result.current[1]('wall'))
    act(() => void vi.advanceTimersByTime(SEARCH_DELAY_MS))

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('wall')
    vi.useRealTimers()
  })

  it('follows a change from outside when nothing typed waits to be committed', () => {
    const { result, rerender } = renderHook(({ committed }) => useSearchBox(committed, () => {}), { initialProps: { committed: 'wall' } })

    rerender({ committed: '' })

    expect(result.current[0]).toBe('')
  })

  it('keeps what the person is typing when the committed value changes meanwhile', () => {
    const { result, rerender } = renderHook(({ committed }) => useSearchBox(committed, () => {}), { initialProps: { committed: 'wall' } })

    act(() => result.current[1]('wallx'))
    rerender({ committed: '' })

    expect(result.current[0]).toBe('wallx')
  })

  it('a cleared search is not brought back by the old committed value', () => {
    const { result, rerender } = renderHook(({ committed }) => useSearchBox(committed, () => {}), { initialProps: { committed: 'wall' } })

    rerender({ committed: '' })
    rerender({ committed: '' })

    expect(result.current[0]).toBe('')
  })
})
