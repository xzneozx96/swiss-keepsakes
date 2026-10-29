import type { AdminStore } from '@sk/api-contract'

import { storeInformationState } from '@sk/domain/identity'

/**
 * How many of the four opening conditions a store has met, counted from the list data (`AdminStore` carries no
 * conditions list). The catalogue and the policies count as unmet until their stories add them to `AdminStore`.
 */
export function conditionsMet(store: AdminStore): 0 | 1 | 2 | 3 | 4 {
  return (storeInformationState(store) === 'met' ? 1 : 0) + (store.paymentAccount === 'met' ? 1 : 0) as 0 | 1 | 2
}
