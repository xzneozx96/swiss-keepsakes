import type { Clock, JobQueue, SentMailRepository } from '../ports.ts'
import type { MailRequest } from './render-mail.ts'

// The data of a mail job. A dead-lettered copy gets a new job id, so the mail id travels in the data too.
export type MailJob = MailRequest & { mailId: string }

export interface QueueMailDeps<T> {
  sentMail: SentMailRepository<T>
  jobs: JobQueue<T>
  clock: Clock
  queue: string
}

// A business command calls this inside its own uow.run, so the mail row and its job commit or roll back with
// the business change (D4). The mail id is also the job id and the Message-ID's local part (section 8).
export function makeQueueMail<T>({ sentMail, jobs, clock, queue }: QueueMailDeps<T>) {
  return async (tx: T, request: MailRequest): Promise<string> => {
    const mailId = await sentMail.queue(tx, {
      storeId: request.storeId,
      template: request.template,
      language: request.language,
      recipient: request.to,
      queuedAt: clock.now(),
    })
    const job: MailJob = { ...request, mailId }
    await jobs.send(tx, queue, job, { id: mailId })
    return mailId
  }
}
