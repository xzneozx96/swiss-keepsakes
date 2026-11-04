import { act, renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOnboardingAnswers } from '@/features/content/hooks/use-onboarding-answers'
import { forgetAnswers, resetAnswersStoreForTests, saveAnswers } from '@/features/onboarding/lib/answers-store'

beforeEach(() => {
  window.localStorage.clear()
  resetAnswersStoreForTests()
})

describe('[E4.5][AC37] useOnboardingAnswers reads the store as rank preferences', () => {
  it('gives no answers, and the same object each time, when nothing is answered', () => {
    const view = renderHook(() => useOnboardingAnswers())
    const first = view.result.current

    view.rerender()

    expect(first).toEqual({ stay: null, interests: [] })
    expect(view.result.current).toBe(first)
  })

  it('follows a saved answer with the stay and interests, stable until the next change', () => {
    const view = renderHook(() => useOnboardingAnswers())

    act(() => saveAnswers({ stay: 'multi_day', interests: ['food-drink'] }))
    const saved = view.result.current
    view.rerender()

    expect(saved).toEqual({ stay: 'multi_day', interests: ['food-drink'] })
    expect(view.result.current).toBe(saved)

    act(() => forgetAnswers())

    expect(view.result.current).toEqual({ stay: null, interests: [] })
  })

  it('renders no answers on the server, even when the browser has some', () => {
    saveAnswers({ stay: 'short_stay', interests: ['food-drink'] })
    let seen: unknown

    function Probe() {
      seen = useOnboardingAnswers()

      return null
    }

    renderToString(<Probe />)

    expect(seen).toEqual({ stay: null, interests: [] })
  })
})
