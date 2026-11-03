import type { MessageKey } from '@/i18n/en'

import { ApiProblem } from '@/features/data-client/errors'

const byType: Record<string, MessageKey> = {
  'precondition-failed': 'places.problem.stale',
  'forbidden': 'places.problem.forbidden',
  'not-found': 'places.problem.notFound',
  'content-slug-taken': 'places.problem.slugTaken',
  'slug-conflict': 'places.problem.slugConflict',
  'publish-incomplete': 'places.problem.incomplete',
  'media-invalid': 'places.problem.mediaInvalid',
  'media-retired': 'places.problem.mediaRetired',
  'media-processing': 'places.problem.mediaProcessing',
  'reference-invalid': 'places.problem.referenceInvalid',
  'validation-failed': 'places.problem.validation',
  'content-in-use': 'places.problem.inUse',
  'published-cannot-be-deleted': 'places.problem.publishedCannotDelete',
  'not-published': 'places.problem.notPublished',
}

/** The words for a problem `type` of the API; a type this screen does not know gets the generic line. */
export function problemMessageKey(type: string): MessageKey {
  return byType[type] ?? 'places.problem.generic'
}

/** What still uses a pin: stories that link it, editorial reviews about it, tours with a stop on it. */
export interface PinUses {
  stories: number
  reviews: number
  tours: number
}

/** The refusal of a delete: 409 `content-in-use` with the numbers in `errors[0].params` (code `pin-in-use`). */
export class PinProblem extends ApiProblem {
  readonly uses: PinUses | undefined

  constructor(problem: ApiProblem, body: unknown) {
    super(problem.status, problem.type, problem.message, problem.requestId)
    const errors = typeof body === 'object' && body !== null ? (body as { errors?: unknown }).errors : undefined
    const found = Array.isArray(errors) ? (errors as { code?: unknown, params?: Record<string, unknown> }[]).find(error => error.code === 'pin-in-use') : undefined
    const count = (name: keyof PinUses) => Number(found?.params?.[name] ?? 0)

    this.uses = found ? { stories: count('stories'), reviews: count('reviews'), tours: count('tours') } : undefined
  }
}

export const pinUsesOf = (error: unknown) => (error instanceof PinProblem ? error.uses : undefined)
