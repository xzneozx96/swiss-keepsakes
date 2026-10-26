/**
 * Account sub-screens (1.12s). Each hub row drills into one, kept in the URL as `?tab=` so
 * the 1.12r tab links (`/account?tab=payments`) still land
 * on the same content. No `tab` is the hub itself.
 */
export const accountSections = [
  'orders',
  'payments',
  'profile',
  'notifications',
  'edit',
] as const
export type AccountSection = (typeof accountSections)[number]
