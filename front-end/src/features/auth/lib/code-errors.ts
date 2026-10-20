export type CodeFailure = 'wrong' | 'expired' | 'locked' | 'rateLimited' | 'unavailable'

/**
 * What a failed call to Better Auth means for the sign-in code. The client keeps the error code the API sent.
 * `INVALID_OTP` and `OTP_EXPIRED` are 400, `TOO_MANY_ATTEMPTS` is 403, and the rate limit is 429 with no code.
 * Anything else, such as a lost connection or a 5xx, says nothing about the code.
 */
export function codeFailure(error: unknown): CodeFailure {
  if (typeof error !== 'object' || error === null)
    return 'unavailable'
  const { code, status } = error as { code?: unknown, status?: unknown }

  if (code === 'INVALID_OTP')
    return 'wrong'
  if (code === 'OTP_EXPIRED')
    return 'expired'
  if (code === 'TOO_MANY_ATTEMPTS')
    return 'locked'
  if (status === 429)
    return 'rateLimited'

  return 'unavailable'
}
