import type { Clock } from './clock.ts'
import type { Tx } from './db/client.ts'
import { webhookEvents } from './db/schema.ts'

export interface WebhookEvent {
  provider: string
  eventId: string
  payload: unknown
}

export function createWebhookEvents(clock: Clock) {
  return {
    // Providers send the same event more than once (F13). A repeat inserts nothing and says so, and the
    // endpoint then answers 200 without queuing the event again.
    async record(tx: Tx, event: WebhookEvent): Promise<'recorded' | 'duplicate'> {
      const inserted = await tx.insert(webhookEvents)
        .values({ ...event, receivedAt: clock.now() })
        .onConflictDoNothing()
        .returning({ eventId: webhookEvents.eventId })
      return inserted.length > 0 ? 'recorded' : 'duplicate'
    },
  }
}
