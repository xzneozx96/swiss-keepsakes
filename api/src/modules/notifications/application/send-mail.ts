import type { Clock, InvitationLink, Mailer, SentMailRepository, UnitOfWork } from '../ports.ts'
import type { MailJob } from './queue-mail.ts'
import { MailRenderError, renderMail } from './render-mail.ts'

export interface SendMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  mailer: Mailer
  invitationLink: InvitationLink<T>
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

// One attempt of the mail job, under the mail's row lock (architecture section 8). Only a queued mail is sent:
// a second run of the same job waits for the lock, then finds the mail sent and stops, and a mail marked failed
// after its alert is never sent. A failed attempt rolls back, is counted in a transaction of its own, and is
// thrown again as a MailAttemptError, so pg-boss retries it. SMTP has no idempotency key: when the server
// accepted the message but the commit never happened (a crash, a shutdown, a lost connection), the retry sends
// it again with the same Message-ID. The invitation link is built in the same transaction, so a token it
// stores commits only with a sent mail.
export function makeSendMail<T>({ uow, sentMail, mailer, invitationLink, clock }: SendMailDeps<T>) {
  return async (job: MailJob): Promise<void> => {
    try {
      await uow.run(async (tx) => {
        if (await sentMail.lockForSend(tx, job.mailId) !== 'queued')
          return
        const link = job.template === 'N01' ? undefined : await invitationLink(tx, job.template, job.params.invitationId)
        const { to, subject, text } = renderMail(job, link)
        const { response } = await mailer.send({ id: job.mailId, to, subject, text })
        await sentMail.recordSent(tx, job.mailId, { at: clock.now(), response })
      })
    }
    catch (error) {
      const failure = toAttemptError(error)
      await uow.run(tx => sentMail.recordAttemptFailed(tx, job.mailId, failure.message))
      throw failure
    }
  }
}
