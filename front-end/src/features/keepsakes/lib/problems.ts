import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'

/** The copy of each API problem on the keepsake screens; also the `meta.error` map of the commands that show their refusal as a toast. */
export const keepsakeProblemKeys: Partial<Record<string, MessageKey>> = {
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
  return keepsakeProblemKeys[type] ?? 'keepsakes.problem.generic'
}
