import type { ConditionSource } from '../ports.ts'

// The three A02 conditions that later stories decide. Each answers `pending` (not available yet), so no store
// can open for sale before they exist. Replace the entry when its story lands: `payment-account` by E4.12 (the
// charges and TWINT checks), `catalogue` by E2.5 (one published product or tour) and `policies` by E2.6.
// main.ts passes this source to the use cases.
export function createPendingConditions<T>(): ConditionSource<T> {
  return {
    async laterConditions() {
      return { 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' }
    },
  }
}
