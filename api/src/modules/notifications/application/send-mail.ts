import type { Clock, Mailer, SentMailRepository, UnitOfWork } from '../ports.ts'
import type { MailJob } from './queue-mail.ts'
import { renderMail } from './render-mail.ts'

export interface SendMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  mailer: Mailer
  clock: Clock
}

// The error's code and SMTP reply code, never its message: a server's reply can quote the recipient's address.
function describeError(error: unknown): string {
  if (!(error instanceof Error))
    return 'unknown'
  const { code, responseCode } = error as { code?: unknown, responseCode?: unknown }
  const name = typeof code === 'string' ? code : error.name
  return typeof responseCode === 'number' ? `${name} ${responseCode}` : name
}

// One attempt of the mail job. A failed attempt is counted and rethrown, so pg-boss retries it. A mail already
// recorded as sent is not sent again. SMTP has no idempotency key, so a send whose reply was lost goes out
// again, with the same Message-ID (architecture section 8).
export function makeSendMail<T>({ uow, sentMail, mailer, clock }: SendMailDeps<T>) {
  return async (job: MailJob): Promise<void> => {
    if (await uow.run(tx => sentMail.status(tx, job.mailId)) === 'sent')
      return
    let response: string
    try {
      const { to, subject, text } = renderMail(job)
      response = (await mailer.send({ id: job.mailId, to, subject, text })).response
    }
    catch (error) {
      await uow.run(tx => sentMail.recordAttemptFailed(tx, job.mailId, describeError(error)))
      throw error
    }
    await uow.run(tx => sentMail.recordSent(tx, job.mailId, { at: clock.now(), response }))
  }
}
