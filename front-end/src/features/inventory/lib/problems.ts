import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'

/** An API problem with the units open orders reserve, which a `stock-below-reserved` refusal carries. */
export class InventoryProblem extends ApiProblem {
  readonly reserved: number | undefined

  constructor(problem: ApiProblem, body: unknown) {
    super(problem.status, problem.type, problem.message, problem.requestId)
    const reserved = typeof body === 'object' && body !== null ? (body as { reserved?: unknown }).reserved : undefined

    this.reserved = typeof reserved === 'number' ? reserved : undefined
  }
}

/** The copy of each API problem on the inventory screens. An unknown type reads as the generic text. */
const problemKeys: Partial<Record<string, MessageKey>> = {
  'forbidden': 'inventory.problem.forbidden',
  'not-found': 'inventory.problem.notFound',
}

export const problemMessageKey = (type: string): MessageKey => problemKeys[type] ?? 'inventory.problem.generic'

/** The "{n} unit(s) reserved by orders, so stock can’t go below" text for `count` reserved units. */
export function belowReservedText(count: number): MessageKey {
  return count === 1 ? 'inventory.error.belowReserved.one' : 'inventory.error.belowReserved.other'
}

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/** The text of a refused stock write: the reserved units for `stock-below-reserved` (the API's figure, else `reserved`), else the problem's own copy. */
export function refusalText(t: Translate, failure: unknown, reserved: number): string {
  if (!(failure instanceof InventoryProblem))
    return t(problemMessageKey('unknown'))
  if (failure.type !== 'stock-below-reserved')
    return t(problemMessageKey(failure.type))
  const count = failure.reserved ?? reserved

  return t(belowReservedText(count), { count })
}
