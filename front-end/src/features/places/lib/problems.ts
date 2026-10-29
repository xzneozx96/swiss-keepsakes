import type { MessageKey } from '@/i18n/en'

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
