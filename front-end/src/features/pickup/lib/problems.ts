import { ApiProblem } from '@/features/data-client/errors'

/** The `errors[].code` the API gives a 422 when the shop already has 100 active pickup points, and the `type` it reads as here. */
export const pickupLimitType = 'pickup-limit'

/**
 * A 422 `validation-failed` whose reason is the 100-point limit reads as its own `type`, `pickup-limit`, so the
 * commands' `meta.error` map and the sheet can word it; every other problem keeps the type the API gave it.
 */
export class PickupProblem extends ApiProblem {
  constructor(problem: ApiProblem, body: unknown) {
    const errors = typeof body === 'object' && body !== null ? (body as { errors?: unknown }).errors : undefined
    const limited = Array.isArray(errors) && errors.some((error: { code?: unknown }) => error?.code === pickupLimitType)

    super(problem.status, limited ? pickupLimitType : problem.type, problem.message, problem.requestId)
  }
}
