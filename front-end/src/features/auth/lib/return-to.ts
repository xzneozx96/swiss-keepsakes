/**
 * Where the sign-in screen goes after sign-in. Only in-app paths are accepted, so a crafted
 * link cannot send the guest to another site or loop back into sign-in.
 */
export function safeReturnTo(value: string | undefined): string {
  if (
    !value
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.startsWith('/sign-in')
  ) {
    return '/account'
  }

  return value
}
