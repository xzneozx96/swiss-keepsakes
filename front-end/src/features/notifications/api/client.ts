import type { Mail } from '@sk/domain/notifications'

/** The emails sent to guests and staff. */
export interface NotificationsClient {
  mail: () => Promise<Mail[]>
}
