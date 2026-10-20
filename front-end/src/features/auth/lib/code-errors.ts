const EXPIRED = /expired/i

/**
 * What a refused Neon Auth code sign-in means for the code. The SDK keeps the HTTP status and
 * Better Auth's message but drops its error code, so `INVALID_OTP` and `OTP_EXPIRED` (both 400)
 * differ only in the message. `TOO_MANY_ATTEMPTS` is 403. Anything else, such as a lost connection
 * or the rate limit, says nothing about the code.
 */
export function codeErrorStatus(
  error: unknown,
): 'wrong' | 'expired' | 'locked' | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error))
    return undefined
  if (error.status === 403)
    return 'locked'
  if (error.status !== 400)
    return undefined

  return 'message' in error && typeof error.message === 'string' && EXPIRED.test(error.message)
    ? 'expired'
    : 'wrong'
}
