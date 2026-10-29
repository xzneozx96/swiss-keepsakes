import type { Refusal } from './option-rules'

import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'
import { refusalsOfProblem } from './option-rules'

/** An API problem with the refusals it names (a 422 of the options and variants rules). */
export class KeepsakeProblem extends ApiProblem {
  readonly refusals: Refusal[]

  constructor(problem: ApiProblem, body: unknown) {
    super(problem.status, problem.type, problem.message, problem.requestId)
    const errors = typeof body === 'object' && body !== null ? (body as { errors?: unknown }).errors : undefined

    this.refusals = Array.isArray(errors) ? refusalsOfProblem(errors as Parameters<typeof refusalsOfProblem>[0]) : []
  }
}

export const refusalsOf = (error: unknown): Refusal[] => (error instanceof KeepsakeProblem ? error.refusals : [])

const byProblemType: Record<string, MessageKey> = {
  'precondition-failed': 'keepsakes.problem.stale',
  'sku-code-taken': 'keepsakes.problem.skuTaken',
  'slug-conflict': 'keepsakes.problem.slugConflict',
  'publish-incomplete': 'keepsakes.problem.incomplete',
  'media-retired': 'keepsakes.problem.mediaRetired',
  'media-invalid': 'keepsakes.problem.mediaInvalid',
  'media-processing': 'keepsakes.problem.mediaProcessing',
  'validation-failed': 'keepsakes.problem.invalid',
  'forbidden': 'keepsakes.problem.forbidden',
  'not-found': 'keepsakes.problem.notFound',
  'not-published': 'keepsakes.problem.notPublished',
  'storage-unavailable': 'keepsakes.problem.storage',
}

export const problemTypeOf = (error: unknown) => (error instanceof ApiProblem ? error.type : 'unknown')

/** The copy of an API problem on the keepsake screens. An unknown type reads as the generic text. */
export function problemMessageKey(type: string): MessageKey {
  return byProblemType[type] ?? 'keepsakes.problem.generic'
}
