import type { Mailer, OutgoingMail } from '../../src/modules/notifications/ports.ts'

// The in-memory Mailer for tests (delivery plan section 2, Mail). `attempts` holds every message it was
// given, `sent` the ones it accepted. After `failWith(error)` every send rejects with that error, as an SMTP
// server that refuses or times out would.
export function createMemoryMailer() {
  const attempts: OutgoingMail[] = []
  const sent: OutgoingMail[] = []
  let failure: Error | undefined
  const mailer: Mailer = {
    async send(mail) {
      attempts.push(mail)
      if (failure)
        throw failure
      sent.push(mail)
      return { response: `250 2.0.0 OK queued as ${mail.id}` }
    },
  }
  return {
    mailer,
    attempts,
    sent,
    failWith(error: Error | undefined) {
      failure = error
    },
  }
}

// An error shaped like nodemailer's: a code, and for a server reply its numeric code.
export function smtpError(code: string, responseCode?: number): Error {
  return Object.assign(new Error(`${code}: refused for anna@example.ch`), { code, responseCode })
}
