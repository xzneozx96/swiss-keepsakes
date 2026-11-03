import type { ProblemType } from '@sk/api-contract'
import type { Failure } from '../application/failure.ts'

export interface FailureProblem {
  status: 403 | 404 | 422
  type: ProblemType
  title: string
  reserved?: number
  skuId?: string
  errors?: { in: 'body', path: string, message: string, code?: string, params?: Record<string, string | number> }[]
}

const plural = (count: number, one: string, other: string) => (count === 1 ? one : other)

export function failureProblem(failure: Failure): FailureProblem {
  switch (failure.reason) {
    case 'forbidden': return { status: 403, type: 'forbidden', title: 'You cannot change the stock of this store.' }
    case 'not-found': return { status: 404, type: 'not-found', title: 'Not found.', ...(failure.skuId && { skuId: failure.skuId }) }
    case 'stock-below-reserved': {
      const { reserved, skuId } = failure
      const title = reserved === undefined
        ? 'Stock cannot go below the units reserved by orders.'
        : `${reserved} ${plural(reserved, 'unit is', 'units are')} reserved by orders, so stock can’t go below the ${reserved} reserved.`

      return {
        status: 422,
        type: 'stock-below-reserved',
        title,
        ...(reserved !== undefined && { reserved }),
        ...(skuId && { skuId }),
        errors: [{ in: 'body', path: 'onHand', message: title, code: 'stock-below-reserved', ...(reserved !== undefined && skuId && { params: { reserved, skuId } }) }],
      }
    }
  }
}
