import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ApiProblem } from '@/features/data-client/errors'
import { keepsKey, useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'

const problem = (status: number, type: string) => new ApiProblem(status, type, type)

describe('[E2.3][S8] which failures keep the Idempotency-Key', () => {
  it.each([
    ['a lost connection', new TypeError('Failed to fetch'), true],
    ['a timeout', new DOMException('timed out', 'TimeoutError'), true],
    ['a 500', problem(500, 'internal-error'), true],
    ['a 503', problem(503, 'unhealthy'), true],
    ['a key still in use', problem(409, 'idempotency-key-in-use'), true],
    ['a refusal', problem(409, 'onboarding-incomplete'), false],
    ['a validation error', problem(400, 'validation-failed'), false],
    ['a replayed key with another body', problem(422, 'idempotency-key-reused'), false],
    ['a 401', problem(401, 'unauthenticated'), false],
  ])('%s', (_name, error, keeps) => {
    expect(keepsKey(error)).toBe(keeps)
  })
})

describe('[E2.3][S8] useIdempotencyKey', () => {
  it('returns one key for one intent and renews it after a success, a final answer or a changed input', () => {
    const { result, rerender } = renderHook(({ input }) => useIdempotencyKey(input), { initialProps: { input: { a: 1 } } })
    const first = result.current.next()

    expect(result.current.next()).toBe(first)
    act(() => result.current.settled(new TypeError('Failed to fetch')))
    expect(result.current.next()).toBe(first)
    act(() => result.current.settled(problem(503, 'internal-error')))
    expect(result.current.next()).toBe(first)

    act(() => result.current.settled(problem(409, 'onboarding-incomplete')))
    const second = result.current.next()

    expect(second).not.toBe(first)
    act(() => result.current.settled())
    const third = result.current.next()

    expect(third).not.toBe(second)
    rerender({ input: { a: 2 } })
    expect(result.current.next()).not.toBe(third)
  })
})
