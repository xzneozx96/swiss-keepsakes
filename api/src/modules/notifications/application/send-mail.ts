import type { Clock, Mailer, SentMailRepository, UnitOfWork } from '../ports.ts'
import type { MailJob } from './queue-mail.ts'
import { renderMail } from './render-mail.ts'

export interface SendMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  mailer: Mailer
  clock: Clock
}

// What a failed attempt throws. pg-boss stores it with the job and copies it to the dead-letter job, so it
// holds only the error code and the SMTP reply code. The original error's message, reply text and rejected
// list can quote the address, so it is never kept, not even as `cause`.
export class MailAttemptError extends Error {
  override name = 'MailAttemptError'
  readonly code: string
  readonly responseCode: number | undefined

  constructor(code: string, responseCode: number | undefined) {
    super(responseCode === undefined ? code : `${code} ${responseCode}`)
    this.code = code
    this.responseCode = responseCode
  }
}

function toAttemptError(error: unknown): MailAttemptError {
  if (error instanceof MailAttemptError)
    return error
  if (!(error instanceof Error))
    return new MailAttemptError('unknown', undefined)
  const { code, responseCode } = error as { code?: unknown, responseCode?: unknown }
  return new MailAttemptError(typeof code === 'string' ? code : error.name, typeof responseCode === 'number' ? responseCode : undefined)
}

// One attempt of the mail job. A failed attempt is counted and thrown again as a MailAttemptError, so pg-boss
// retries it. A mail already recorded as sent is not sent again. SMTP has no idempotency key, so a send whose
// reply was lost goes out again, with the same Message-ID (architecture section 8).
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
      const failure = toAttemptError(error)
      await uow.run(tx => sentMail.recordAttemptFailed(tx, job.mailId, failure.message))
      throw failure
    }
    await uow.run(tx => sentMail.recordSent(tx, job.mailId, { at: clock.now(), response }))
  }
}
