export type CodeFailure = 'wrong' | 'expired' | 'locked' | 'rateLimited' | 'invalidEmail' | 'unavailable'

/**
 * What a failed call to Better Auth means for the sign-in code. The client keeps the error code the API sent.
 * `INVALID_OTP` and `OTP_EXPIRED` are 400, `TOO_MANY_ATTEMPTS` is 403, and the rate limit is 429 with no code.
 * `INVALID_EMAIL` is the API's own check of the address, which the form's check should have caught. Anything else, such as a lost connection or a 5xx, says nothing about the code.
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
  if (code === 'INVALID_EMAIL')
    return 'invalidEmail'
  if (status === 429)
    return 'rateLimited'

  return 'unavailable'
}
