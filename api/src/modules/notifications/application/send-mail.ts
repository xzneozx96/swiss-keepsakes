import type { Clock, Mailer, SentMailRepository, UnitOfWork } from '../ports.ts'
import type { MailJob } from './queue-mail.ts'
import { MailRenderError, renderMail } from './render-mail.ts'

export interface SendMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  mailer: Mailer
  clock: Clock
}

// What a failed attempt throws. pg-boss stores it with the job and copies it to the dead-letter job, so it
// holds only the error code and the SMTP reply code. The original error's message, reply text and rejected
// list can quote the address, so it is never kept, not even as `cause`. A permanent failure cannot succeed on
// a retry, so the job skips its remaining attempts and goes to the alert at once.
export class MailAttemptError extends Error {
  override name = 'MailAttemptError'
  readonly code: string
  readonly responseCode: number | undefined
  readonly permanent: boolean

  constructor(code: string, responseCode: number | undefined, permanent: boolean) {
    super(responseCode === undefined ? code : `${code} ${responseCode}`)
    this.code = code
    this.responseCode = responseCode
    this.permanent = permanent
  }
}

// A 5xx reply is a permanent refusal (RFC 5321 section 4.2.1), such as EAUTH 535 or EENVELOPE 550. A 4xx
// reply, a lost connection or a missing SMTP_* setting can pass, so those retry.
export function toAttemptError(error: unknown): MailAttemptError {
  if (error instanceof MailAttemptError)
    return error
  if (error instanceof MailRenderError)
    return new MailAttemptError(error.name, undefined, true)
  if (!(error instanceof Error))
    return new MailAttemptError('unknown', undefined, false)
  const { code, responseCode } = error as { code?: unknown, responseCode?: unknown }
  const reply = typeof responseCode === 'number' ? responseCode : undefined
  return new MailAttemptError(typeof code === 'string' ? code : error.name, reply, reply !== undefined && reply >= 500 && reply < 600)
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
