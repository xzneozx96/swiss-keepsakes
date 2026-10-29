import type { ProblemType } from '@sk/api-contract'
import type { Failure } from '../application/failure.ts'
import type { Refusal } from '../ports.ts'

export interface FailureProblem {
  status: 403 | 404 | 409 | 412 | 422
  type: ProblemType
  title: string
  errors?: { in: 'body', path: string, message: string, code?: string, params?: Record<string, string | number> }[]
  mediaIds?: string[]
}

const gapMessages = {
  name: 'Add the name and the text in English or German',
  photos: 'Add at least one photo',
  variants: 'Put at least one variant on sale',
} as const

const plural = (count: number, one: string, other: string) => (count === 1 ? one : other)

// "Used by 2 variants (A, B and 1 more)": the codes the rule named, then how many more there are.
function usedBy(params: Refusal['params']): string {
  const count = Number(params?.count ?? 0)
  const more = Number(params?.more ?? 0)
  const codes = `${params?.codes ?? ''}${more > 0 ? ` and ${more} more` : ''}`

  return `Used by ${count} ${plural(count, 'variant', 'variants')} (${codes})`
}

// The merchant's words for a refusal, in English. A screen translates from `code` and `params`, so this is for a client
// that does not.
export function refusalMessage({ code, params }: Refusal): string {
  switch (code) {
    case 'option-name-required': return 'Name the option in English or German.'
    case 'value-name-required': return 'Name the value in English or German.'
    case 'option-needs-value': return `${params?.option || 'This option'} needs at least one value.`
    case 'option-in-use': return `Can’t delete ${params?.option}. ${usedBy(params)}. Every variant has one of its values.`
    case 'value-in-use': return `Can’t delete ${params?.value}. ${usedBy(params)}. Archive or change those first.`
    case 'values-missing': return `${params?.code || 'A variant'} needs a ${String(params?.option || 'value').toLowerCase()}.`
    case 'value-unknown': return 'That value does not belong to this option.'
    case 'combination-taken': return !params?.code ? 'This combination is already sold. Each combination is sold once.' : params.archived ? `This combination is already ${params?.code}, archived.` : `This combination is already sold as ${params?.code}. Each combination is sold once.`
    case 'combination-duplicate': return `${params?.code} and ${params?.twin} would both be the same combination.`
    case 'no-options-one-variant': return `A keepsake without options has one variant only (${params?.code}). Add an option to sell more.`
    case 'refs-invalid': return 'This request names an option, a value or a variant twice, or one that is not this keepsake’s.'
    case 'code-duplicate': return `${params?.code} is used twice in this request.`
    case 'variant-reserved': return `Can’t archive ${params?.code}. ${params?.count} ${plural(Number(params?.count), 'unit is', 'units are')} reserved by open orders. Archive it once they are handed over or released.`
    case 'variant-archived': return `${params?.code} is archived and can’t be changed.`
  }
}

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
    case 'refused':
      return {
        status: 422,
        type: 'validation-failed',
        title: 'This can’t be saved. See what needs a fix.',
        errors: failure.refusals.map(refusal => ({ in: 'body' as const, path: refusal.path, message: refusalMessage(refusal), code: refusal.code, ...(refusal.params && { params: refusal.params }) })),
      }
    case 'name-required':
      return { status: 422, type: 'validation-failed', title: 'Add a name in English or German.', errors: [{ in: 'body', path: 'name', message: 'Add a name in English or German' }] }
    case 'sku-code-invalid':
      return { status: 422, type: 'validation-failed', title: 'The SKU code is not valid.', errors: [{ in: 'body', path: failure.path, message: 'Letters and digits, joined by - _ or .' }] }
  }
}
