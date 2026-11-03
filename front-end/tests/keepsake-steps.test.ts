import { describe, expect, it } from 'vitest'

import { isKeepsakeStep, KEEPSAKE_STEPS, keepsakeSearch } from '@/features/keepsakes/lib/search-params'
import { draftStatuses, firstBlockedStep, stepOfCard, stepStatuses } from '@/features/keepsakes/lib/steps'

const check = (card: 'basics' | 'photos' | 'options' | 'variants' | 'commission', code: 'language' | 'photos' | 'variant-for-sale' | 'option-labels' = 'photos') => ({ code, card })

describe('[T-003] the step of a check', () => {
  it.each([
    ['basics', 'details'],
    ['photos', 'details'],
    ['commission', 'details'],
    ['options', 'options'],
    ['variants', 'options'],
  ] as const)('[T-003] the %s card is on the %s step', (card, step) => {
    expect(stepOfCard(card)).toBe(step)
  })

  it('[T-003] a step id from the address is told from any other word', () => {
    expect(KEEPSAKE_STEPS.every(isKeepsakeStep)).toBe(true)
    expect(isKeepsakeStep('billing')).toBe(false)
    expect(isKeepsakeStep(undefined)).toBe(false)
  })
})

describe('[T-003] the status of each step of a saved keepsake', () => {
  const ids = ['details', 'options'] as const

  it('[T-003] every step is done when nothing blocks publishing', () => {
    expect(stepStatuses({ blocking: [] }, ids, false)).toEqual({ details: 'done', options: 'done' })
  })

  it('[T-003] a step with a blocking check is not started until a publish was tried, then it has errors', () => {
    const blocking = [check('photos'), check('variants', 'variant-for-sale')]

    expect(stepStatuses({ blocking }, ids, false)).toEqual({ details: 'todo', options: 'todo' })
    expect(stepStatuses({ blocking }, ids, true)).toEqual({ details: 'error', options: 'error' })
  })

  it('[T-003] the mark goes back to done once the check is gone', () => {
    expect(stepStatuses({ blocking: [check('photos')] }, ids, true).details).toBe('error')
    expect(stepStatuses({ blocking: [] }, ids, true).details).toBe('done')
  })
})

describe('[T-003] the status of each step of a new keepsake', () => {
  const start = { hasName: false, reached: 0, variantsReady: false, nameTried: false, variantsTried: false }

  it('[T-003] nothing is done before a name is typed', () => {
    expect(draftStatuses(start)).toEqual({ details: 'todo', options: 'todo', review: 'todo' })
  })

  it('[T-003] Details is done with a name, and has errors after a Next with no name', () => {
    expect(draftStatuses({ ...start, hasName: true }).details).toBe('done')
    expect(draftStatuses({ ...start, nameTried: true }).details).toBe('error')
  })

  it('[T-008] Options and variants is done once it was passed with every variant ready, and has errors after a Next that was not', () => {
    expect(draftStatuses({ ...start, hasName: true, reached: 1, variantsReady: true }).options).toBe('todo')
    expect(draftStatuses({ ...start, hasName: true, reached: 2, variantsReady: true }).options).toBe('done')
    expect(draftStatuses({ ...start, hasName: true, reached: 2 }).options).toBe('todo')
    expect(draftStatuses({ ...start, hasName: true, reached: 2, variantsTried: true }).options).toBe('error')
  })

  it('[T-003] Review and publish stays not started: the keepsake does not exist yet', () => {
    expect(draftStatuses({ hasName: true, reached: 2, variantsReady: true, nameTried: false, variantsTried: false }).review).toBe('todo')
  })
})

describe('[T-004] Review and publish as the last step', () => {
  const ids = KEEPSAKE_STEPS

  it('[T-008] there are three steps and the last is Review and publish', () => {
    expect(KEEPSAKE_STEPS).toEqual(['details', 'options', 'review'])
  })

  it('[T-004] its mark follows every check: done with none, not started with some, errors after a publish was tried', () => {
    expect(stepStatuses({ blocking: [] }, ids, true).review).toBe('done')
    expect(stepStatuses({ blocking: [check('options')] }, ids, false).review).toBe('todo')
    expect(stepStatuses({ blocking: [check('options')] }, ids, true).review).toBe('error')
  })

  it('[T-004] a blocked publish goes back to the first step, in order, that holds a blocking check', () => {
    expect(firstBlockedStep({ blocking: [check('variants'), check('commission')] })).toBe('details')
    expect(firstBlockedStep({ blocking: [check('variants'), check('options')] })).toBe('options')
    expect(firstBlockedStep({ blocking: [check('variants')] })).toBe('options')
    expect(firstBlockedStep({ blocking: [] })).toBe('details')
  })

  it('[T-004] the old ?view=review address means ?step=review, and the step in the address wins', () => {
    expect(keepsakeSearch({ view: 'review' })).toEqual({ step: 'review' })
    expect(keepsakeSearch({ step: 'options', view: 'review' })).toEqual({ step: 'options' })
    expect(keepsakeSearch({ step: 'details' })).toEqual({ step: undefined })
    expect(keepsakeSearch({ step: 'billing', view: 'edit' })).toEqual({ step: undefined })
  })

  it('[T-008][AC1] the old ?step=variants address opens the merged step', () => {
    expect(keepsakeSearch({ step: 'variants' })).toEqual({ step: 'options' })
    expect(isKeepsakeStep('variants')).toBe(false)
  })
})
