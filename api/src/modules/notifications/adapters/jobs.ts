import type { JobResult, PgBoss } from 'pg-boss'
import type { MailJob } from '../application/queue-mail.ts'
import { toAttemptError } from '../application/send-mail.ts'

export interface MailQueues {
  send: string
  failed: string
}

// The `mail` job and its dead-letter queue (architecture section 8). Tests pass their own names.
export const mailQueues: MailQueues = { send: 'mail', failed: 'mail-failed' }

// Six attempts. Before retry n pg-boss waits 30 * 2^n seconds, less up to half of it as jitter, so the last
// attempt runs about 15 to 30 minutes after the first.
export const mailRetry = { retryLimit: 5, retryDelay: 30, retryBackoff: true }

// Every role creates the queues at startup, because a send to an unknown queue fails. mail-failed retries its
// handler with the same backoff: the handler only marks the row and logs, so it fails while the database does.
// After its last attempt the row stays queued, which the runbook's stale list shows (docs/ops/mail.md).
export async function createMailQueues(boss: PgBoss, queues = mailQueues, retry = mailRetry): Promise<void> {
  // createQueue leaves an existing queue as it is, so each update applies a changed retry policy on the next start.
  await boss.createQueue(queues.failed, retry)
  await boss.updateQueue(queues.failed, retry)
  await boss.createQueue(queues.send, { ...retry, deadLetter: queues.failed })
  await boss.updateQueue(queues.send, { ...retry, deadLetter: queues.failed })
}

export interface MailHandlers {
  sendMail: (job: MailJob) => Promise<void>
  failMail: (mailId: string) => Promise<void>
}

// Only the worker roles call this. pg-boss hands each handler one job at a time (batchSize 1, the default).
export async function startMailWorkers(boss: PgBoss, { sendMail, failMail }: MailHandlers, queues = mailQueues): Promise<void> {
  // With perJobResults a permanent failure goes to mail-failed at once, past the remaining retries. pg-boss
  // stores the output with the job, so it is always the sanitized MailAttemptError, whatever was thrown.
  await boss.work<MailJob>(queues.send, { perJobResults: true }, async jobs => Promise.all(jobs.map(async (job): Promise<JobResult> => {
    try {
      await sendMail(job.data)
      return { id: job.id, status: 'completed' }
    }
    catch (error) {
      const failure = toAttemptError(error)
      return { id: job.id, status: failure.permanent ? 'deadletter' : 'failed', output: failure }
    }
  })))
  await boss.work<MailJob>(queues.failed, async ([job]) => {
    if (job)
      await failMail(job.data.mailId)
  })
}
