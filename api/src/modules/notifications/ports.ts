// What the notifications use cases need. The platform's unit of work, job queue and clock fit the generic
// shapes structurally (backend/architecture.md).

export type MailTemplate = 'N01' | 'N18' | 'N20'

export type InvitationTemplate = 'N18' | 'N20'

export type MailLanguage = 'en' | 'de'

export interface UnitOfWork<T> {
  run: <R>(work: (tx: T) => Promise<R>) => Promise<R>
}

// The per-job options the mail job sets. They override the queue's own.
export interface SendOptions {
  id?: string
  retryLimit?: number
  retryDelay?: number
  retryBackoff?: boolean
  expireInSeconds?: number
  retentionSeconds?: number
  deleteAfterSeconds?: number
}

export interface JobQueue<T> {
  send: (tx: T, queue: string, data: object, options?: SendOptions) => Promise<void>
}

export interface Clock {
  now: () => Date
}

// A rendered message. `id` is the mail id, which goes into the Message-ID header.
export interface OutgoingMail {
  id: string
  to: string
  subject: string
  text: string
  html: string
}

export interface Mailer {
  // Resolves with the server's final reply once the server accepted the message, and rejects otherwise.
  send: (mail: OutgoingMail) => Promise<{ response: string }>
}

// Builds an invitation mail's link when the mail is sent, inside the attempt's transaction, so the job data
// holds the invitation id and never its token (architecture section 8). The identity module implements it
// (E2.3). Undefined means the invitation is no longer open, and the mail fails like a missing template value.
// `invitationRevoked` means the invitation was revoked on purpose before the mail went out: the mail is closed
// without an alert, because nobody has to act on it.
// The `sent_mail.last_error` of a mail closed that way.
export const cancelledError = 'InvitationRevoked'

export const invitationRevoked = Symbol('invitationRevoked')

export type InvitationLink<T> = (tx: T, template: InvitationTemplate, invitationId: string) => Promise<string | typeof invitationRevoked | undefined>

// Removes the secret a job's data holds (the N01 sign-in code) from the mail job and its dead-letter copy.
export interface MailJobScrubber<T> {
  scrubSecrets: (tx: T, mailId: string) => Promise<void>
}

export interface QueuedMail {
  storeId: string | null
  template: MailTemplate
  language: MailLanguage
  recipient: string
  queuedAt: Date
}

export type MailStatus = 'queued' | 'sent' | 'failed'

export interface MailFailure {
  mailId: string
  template: MailTemplate
  attempts: number
  lastError: string | null
}

export interface SentMailRepository<T> {
  // Returns the new mail id.
  queue: (tx: T, mail: QueuedMail) => Promise<string>
  // Locks the mail's row until the transaction ends and returns its status.
  lockForSend: (tx: T, mailId: string) => Promise<MailStatus | undefined>
  // Records a queued mail as sent. A mail that is no longer queued keeps its status.
  recordSent: (tx: T, mailId: string, sent: { at: Date, response: string }) => Promise<void>
  recordAttemptFailed: (tx: T, mailId: string, error: string) => Promise<void>
  // Marks a queued mail failed and returns it, or returns undefined when it is no longer queued.
  markFailed: (tx: T, mailId: string, at: Date) => Promise<MailFailure | undefined>
  // Closes a queued mail that must not go out because its invitation was revoked. It becomes `failed` with
  // the last error `InvitationRevoked` (the status column has no other closed value), raises no alert and is
  // left out of the ops list of mail that did not go out.
  recordCancelled: (tx: T, mailId: string, at: Date) => Promise<void>
}

// Raised once for a mail that will not be retried: after its last attempt, or at once for a failure that a
// retry cannot fix.
export type MailAlert = (failure: MailFailure) => void
