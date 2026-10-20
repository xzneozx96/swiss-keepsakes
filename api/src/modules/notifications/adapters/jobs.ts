import type { PgBoss } from 'pg-boss'
import type { MailJob } from '../application/queue-mail.ts'

export interface MailQueues {
  send: string
  failed: string
}

// The `mail` job and its dead-letter queue (architecture section 8). Tests pass their own names.
export const mailQueues: MailQueues = { send: 'mail', failed: 'mail-failed' }

// Six attempts. Before retry n pg-boss waits 30 * 2^n seconds, less up to half of it as jitter, so the last
// attempt runs about 15 to 30 minutes after the first.
export const mailRetry = { retryLimit: 5, retryDelay: 30, retryBackoff: true }

// Every role creates the queues at startup, because a send to an unknown queue fails.
export async function createMailQueues(boss: PgBoss, queues = mailQueues, retry = mailRetry): Promise<void> {
  await boss.createQueue(queues.failed)
  // createQueue leaves an existing queue as it is, so the update applies a changed retry policy on the next start.
  await boss.createQueue(queues.send, { ...retry, deadLetter: queues.failed })
  await boss.updateQueue(queues.send, { ...retry, deadLetter: queues.failed })
}

export interface MailHandlers {
  sendMail: (job: MailJob) => Promise<void>
  failMail: (mailId: string) => Promise<void>
}

// Only the worker roles call this. pg-boss hands each handler one job at a time (batchSize 1, the default).
export async function startMailWorkers(boss: PgBoss, { sendMail, failMail }: MailHandlers, queues = mailQueues): Promise<void> {
  await boss.work<MailJob>(queues.send, async ([job]) => {
    if (job)
      await sendMail(job.data)
  })
  await boss.work<MailJob>(queues.failed, async ([job]) => {
    if (job)
      await failMail(job.data.mailId)
  })
}
