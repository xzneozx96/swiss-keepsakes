import type { PublishCheck } from '@sk/api-contract'
import type { StepStatus } from '@sk/domain/catalog'
import type { KeepsakeStep } from './search-params'

/** The step that holds the card a publish check names. Details covers name and text, photos and commission. */
const STEP_OF_CARD = {
  basics: 'details',
  photos: 'details',
  commission: 'details',
  options: 'options',
  variants: 'variants',
} as const satisfies Record<PublishCheck['card'], KeepsakeStep>

export const stepOfCard = (card: PublishCheck['card']): KeepsakeStep => STEP_OF_CARD[card]

/**
 * The mark of each step of a saved keepsake, from the API's publish checks: a step that something blocks is not started
 * until a publish was tried (`showErrors`), then it has errors. A step nothing blocks is done.
 */
export function stepStatuses<Id extends KeepsakeStep>(keepsake: { blocking: Pick<PublishCheck, 'card'>[] }, ids: readonly Id[], showErrors: boolean): Record<Id, StepStatus> {
  return Object.fromEntries(ids.map((id) => {
    const blocked = keepsake.blocking.some(check => stepOfCard(check.card) === id)

    return [id, blocked ? (showErrors ? 'error' : 'todo') : 'done']
  })) as Record<Id, StepStatus>
}

/**
 * The mark of each step of a keepsake that is only in the browser. `reached` is the index of the furthest step opened:
 * Options is done once it was passed. Review and publish waits for the keepsake to exist.
 */
export function draftStatuses({ hasName, reached, soldCount, nameTried, variantsTried }: {
  hasName: boolean
  reached: number
  soldCount: number
  nameTried: boolean
  variantsTried: boolean
}): Record<KeepsakeStep | 'review', StepStatus> {
  return {
    details: hasName ? 'done' : nameTried ? 'error' : 'todo',
    options: reached > 1 ? 'done' : 'todo',
    variants: soldCount > 0 ? 'done' : variantsTried ? 'error' : 'todo',
    review: 'todo',
  }
}
