import type { Tx } from '../../../platform/db/client.ts'
import type { MailJobScrubber } from '../ports.ts'
import type { MailQueues } from './jobs.ts'
import { sql } from 'drizzle-orm'
import { mailQueues } from './jobs.ts'

// pg-boss keeps the data of a failed job, and copies it to the dead-letter queue as a new job. Both carry the
// mail id, so one update reaches the job and its copy. Removing `params.code` leaves the rest for the ops list.
export function createMailJobScrubber(queues: MailQueues = mailQueues): MailJobScrubber<Tx> {
  return {
    async scrubSecrets(tx, mailId) {
      await tx.execute(sql`
        update pgboss.job set data = data #- '{params,code}'
        where name in (${queues.send}, ${queues.failed}) and data->>'mailId' = ${mailId}`)
    },
  }
}
