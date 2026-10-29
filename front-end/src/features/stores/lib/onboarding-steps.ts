import type { Onboarding } from '@sk/api-contract'

type Conditions = Onboarding['conditions']
export type ConditionKey = Conditions[number]['key']
export type ConditionState = Conditions[number]['state']
export type StepId = ConditionKey | 'open'

export const STEP_ORDER: readonly StepId[] = ['store-information', 'payment-account', 'catalogue', 'policies', 'open']

/** The step before (-1) or after (1) `id`, held at the first and the last. */
export function adjacentStep(id: StepId, delta: -1 | 1): StepId {
  const index = STEP_ORDER.indexOf(id) + delta

  return STEP_ORDER[Math.min(Math.max(index, 0), STEP_ORDER.length - 1)]
}

/** The conditions that still stop the store from opening, in the order the API sends them. */
export function blockers(conditions: Conditions): ConditionKey[] {
  return conditions.filter(condition => condition.state !== 'met').map(condition => condition.key)
}

/** Every step but the store information can be left for later until it is met. */
export function skippable(state: ConditionState, key: ConditionKey): boolean {
  return key !== 'store-information' && state !== 'met'
}

/** Where the Owner starts: the first step, or the last when the API already lets the store open. */
export function firstStep(mayOpenForSale: boolean): StepId {
  return mayOpenForSale ? 'open' : STEP_ORDER[0]
}
