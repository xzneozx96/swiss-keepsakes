import type { PublishCheck } from '@sk/api-contract'
import type { StepStatus } from '@sk/domain/catalog'
import type { KeepsakeStep } from './search-params'

/** The step that holds the card a publish check names. Details covers name and text, photos and commission. */
const STEP_OF_CARD = {
  basics: 'details',
  photos: 'details',
  commission: 'details',
  options: 'options',
  variants: 'options',
} as const satisfies Record<PublishCheck['card'], KeepsakeStep>

export const stepOfCard = (card: PublishCheck['card']): Exclude<KeepsakeStep, 'review'> => STEP_OF_CARD[card]

/** The step to go back to after a blocked publish: the first one, in order, that holds a blocking check. */
export function firstBlockedStep(keepsake: { blocking: Pick<PublishCheck, 'card'>[] }): Exclude<KeepsakeStep, 'review'> {
  const steps = keepsake.blocking.map(check => stepOfCard(check.card))

  return (['details', 'options'] as const).find(step => steps.includes(step)) ?? 'details'
}

/**
 * The mark of each step of a saved keepsake, from the API's publish checks: a step that something blocks is not started
 * until a publish was tried (`showErrors`), then it has errors. A step nothing blocks is done. Review and publish is
 * blocked by any check.
 */
export function stepStatuses<Id extends KeepsakeStep>(keepsake: { blocking: Pick<PublishCheck, 'card'>[] }, ids: readonly Id[], showErrors: boolean): Record<Id, StepStatus> {
  return Object.fromEntries(ids.map((id) => {
    const blocked = keepsake.blocking.some(check => id === 'review' || stepOfCard(check.card) === id)

    return [id, blocked ? (showErrors ? 'error' : 'todo') : 'done']
  })) as Record<Id, StepStatus>
}

/**
 * The mark of each step of a keepsake that is only in the browser. `reached` is the index of the furthest step opened:
 * Options and variants is done once it was passed with every variant ready. Review and publish is the last step of the
 * draft; it is not marked until the keepsake exists.
 */
export function draftStatuses({ hasName, reached, variantsReady, nameTried, variantsTried }: {
  hasName: boolean
  reached: number
  /** At least one variant, each with a price and a code, and every variant has a value of every option. */
  variantsReady: boolean
  nameTried: boolean
  variantsTried: boolean
}): Record<KeepsakeStep, StepStatus> {
  return {
    details: hasName ? 'done' : nameTried ? 'error' : 'todo',
    options: variantsTried && !variantsReady ? 'error' : reached > 1 && variantsReady ? 'done' : 'todo',
    review: 'todo',
  }
}
