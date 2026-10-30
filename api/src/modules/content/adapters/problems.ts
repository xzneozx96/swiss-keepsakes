import type { ProblemType } from '@sk/api-contract'
import type { PublishGap } from '@sk/domain/content'
import type { Failure } from '../application/failure.ts'

export interface FailureProblem {
  status: 403 | 404 | 409 | 412 | 422
  type: ProblemType
  title: string
  errors?: { in: 'body', path: string, message: string }[]
  mediaIds?: string[]
}

const gapMessages: Record<PublishGap, string> = {
  title: 'Add a title in English or German',
  location: 'Set the location on the map',
  slug: 'Add a web address (slug) for each language that has a title',
  pdf: 'Upload the PDF itinerary',
  excerpt: 'Add an excerpt',
  coverMediaId: 'Choose a cover photo',
  subjectPlaceId: 'Choose the place this review is about',
  checkedOn: 'Add the day the facts were checked',
}

export const missingIfMatchProblem = {
  status: 428,
  type: 'precondition-required',
  title: 'Send the version you opened in the If-Match header.',
} as const satisfies { status: 428, type: ProblemType, title: string }

export function failureProblem(failure: Failure): FailureProblem {
  switch (failure.reason) {
    case 'forbidden': return { status: 403, type: 'forbidden', title: 'You cannot change content in this store.' }
    case 'not-found': return { status: 404, type: 'not-found', title: 'Not found.' }
    case 'stale': return { status: 412, type: 'precondition-failed', title: 'Someone saved this after you opened it. Reload and apply your change again.' }
    case 'incomplete':
      return {
        status: 422,
        type: 'publish-incomplete',
        title: 'This cannot be published yet.',
        errors: failure.gaps.map(gap => ({ in: 'body' as const, path: gap, message: gapMessages[gap] })),
      }
    case 'media-retired': return { status: 422, type: 'media-retired', title: 'A file you chose has been removed. Choose another.' }
    case 'media-invalid': return { status: 422, type: 'media-invalid', title: 'A file you chose is not available here.' }
    case 'reference-invalid': return { status: 422, type: 'reference-invalid', title: 'Something you linked is not available here.' }
    case 'slug-taken': return { status: 409, type: 'content-slug-taken', title: 'Another item already uses this web address. Choose a different one.' }
    case 'slug-conflict': return { status: 409, type: 'slug-conflict', title: 'A live web address cannot be renamed by publishing. Save the new address instead.' }
    case 'published-cannot-be-deleted': return { status: 409, type: 'published-cannot-be-deleted', title: 'A published item cannot be deleted. Hide it instead.' }
    case 'published-cannot-move': return { status: 409, type: 'published-version-cannot-move', title: 'A published story version cannot move to another group.' }
    case 'version-exists': return { status: 409, type: 'version-exists', title: 'This group already has a version in that language.' }
    case 'not-published': return { status: 409, type: 'not-published', title: 'This item is not published.' }
    case 'in-use': return { status: 409, type: 'content-in-use', title: 'Other content still uses this item.' }
    case 'type-not-allowed': return { status: 422, type: 'media-type-not-allowed', title: 'This type of file is not allowed. Use JPEG, PNG, WebP, MP3 or PDF.' }
    case 'too-large': return { status: 422, type: 'media-too-large', title: 'This file is too large.' }
    case 'empty': return { status: 422, type: 'media-empty', title: 'This file is empty.' }
    case 'upload-missing': return { status: 404, type: 'upload-missing', title: 'The upload was not found. It may have expired. Upload the file again.' }
    case 'content-mismatch': return { status: 422, type: 'media-content-mismatch', title: 'The file is not the type it says it is.' }
    case 'media-processing': return { status: 422, type: 'media-processing', title: 'A file is still being processed. Try again in a moment.', mediaIds: failure.mediaIds }
    case 'name-missing':
      return { status: 422, type: 'validation-failed', title: 'Give the category a name in English or German.', errors: [{ in: 'body', path: 'name', message: 'Give a name in English or German' }] }
    case 'order-mismatch':
      return { status: 422, type: 'validation-failed', title: 'The list changed. Reload it and move the category again.', errors: [{ in: 'body', path: 'ids', message: 'Send exactly the categories that are in this group now' }] }
    case 'category-has-children': return { status: 409, type: 'category-has-children', title: 'This category has sub-categories. Move or delete them first.' }
    case 'category-in-use': return { status: 409, type: 'category-in-use', title: 'This category is still used by content. Remove it from that content first.' }
    case 'category-too-deep': return { status: 409, type: 'category-too-deep', title: 'A sub-category cannot hold other categories. Choose a top-level category.' }
    case 'category-parent-has-children': return { status: 409, type: 'category-parent-has-children', title: 'This category has sub-categories, so it cannot become a sub-category itself.' }
  }
}

export const invalidIfMatchProblem = {
  status: 400,
  type: 'validation-failed',
  title: 'If-Match must be the version you opened, such as "3".',
  errors: [{ in: 'header', path: 'If-Match', message: 'Send the version you opened, such as "3".' }],
} as const satisfies { status: 400, type: ProblemType, title: string, errors: { in: 'header', path: string, message: string }[] }
