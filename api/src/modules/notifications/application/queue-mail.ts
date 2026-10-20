import type { Clock, JobQueue, SentMailRepository } from '../ports.ts'
import type { MailRequest } from './render-mail.ts'
import { z } from 'zod'

// The data of a mail job. A dead-lettered copy gets a new job id, so the mail id travels in the data too.
export type MailJob = MailRequest & { mailId: string }

export interface QueueMailDeps<T> {
  sentMail: SentMailRepository<T>
  jobs: JobQueue<T>
  clock: Clock
  queue: string
}

// One plain address, the rule SMTP_FROM uses. nodemailer reads a list, a display name or a header line in `to`
// as more recipients, and the body can carry an invitation link.
const singleAddress = z.email()

// A business command calls this inside its own uow.run, so the mail row and its job commit or roll back with
// the business change (D4). The mail id is also the job id and the Message-ID's local part (section 8).
export function makeQueueMail<T>({ sentMail, jobs, clock, queue }: QueueMailDeps<T>) {
  return async (tx: T, request: MailRequest): Promise<string> => {
    if (!singleAddress.safeParse(request.to).success)
      throw new Error('A mail goes to one address only')
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
