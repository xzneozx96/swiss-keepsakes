import type { ProblemType } from '@sk/api-contract'
import type { Failure } from '../application/failure.ts'

export interface FailureProblem {
  status: 403 | 404 | 409 | 412 | 422
  type: ProblemType
  title: string
  errors?: { in: 'body', path: string, message: string }[]
  mediaIds?: string[]
}

const gapMessages = {
  name: 'Add the name and the text in English or German',
  photos: 'Add at least one photo',
  variants: 'Put at least one variant on sale',
} as const

export const missingIfMatchProblem = {
  status: 428,
  type: 'precondition-required',
  title: 'Send the version you opened in the If-Match header.',
} as const satisfies { status: 428, type: ProblemType, title: string }

export const invalidIfMatchProblem = {
  status: 400,
  type: 'validation-failed',
  title: 'If-Match must be the version you opened, such as "3".',
  errors: [{ in: 'header', path: 'If-Match', message: 'Send the version you opened, such as "3".' }],
} as const satisfies { status: 400, type: ProblemType, title: string, errors: { in: 'header', path: string, message: string }[] }

export function failureProblem(failure: Failure): FailureProblem {
  switch (failure.reason) {
    case 'forbidden': return { status: 403, type: 'forbidden', title: 'You cannot change the catalog of this store.' }
    case 'not-found': return { status: 404, type: 'not-found', title: 'Not found.' }
    case 'stale': return { status: 412, type: 'precondition-failed', title: 'Someone saved this after you opened it. Reload and apply your change again.' }
    case 'incomplete':
      return {
        status: 422,
        type: 'publish-incomplete',
        title: 'This cannot be published yet.',
        errors: failure.gaps.map(gap => ({ in: 'body' as const, path: gap, message: gapMessages[gap] })),
      }
    case 'media-retired': return { status: 422, type: 'media-retired', title: 'A photo you chose has been removed. Choose another.' }
    case 'media-invalid': return { status: 422, type: 'media-invalid', title: 'A file you chose is not available here, or is not a photo.' }
    case 'media-processing': return { status: 422, type: 'media-processing', title: 'A photo is still being processed. Try again in a moment.', mediaIds: failure.mediaIds }
    case 'not-published': return { status: 409, type: 'not-published', title: 'This keepsake is not published.' }
    case 'slug-conflict': return { status: 409, type: 'slug-conflict', title: 'Another keepsake just took this web address. Publish again.' }
    case 'sku-code-taken': return { status: 409, type: 'sku-code-taken', title: 'This SKU code is already used in your shop.' }
    case 'name-required':
      return { status: 422, type: 'validation-failed', title: 'Add a name in English or German.', errors: [{ in: 'body', path: 'name', message: 'Add a name in English or German' }] }
    case 'sku-code-invalid':
      return { status: 422, type: 'validation-failed', title: 'The SKU code is not valid.', errors: [{ in: 'body', path: failure.path, message: 'Letters and digits, joined by - _ or .' }] }
  }
}
