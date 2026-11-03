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
