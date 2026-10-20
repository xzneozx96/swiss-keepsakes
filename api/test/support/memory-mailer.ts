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

// The address a refusal quotes. A test that finds it in stored data has found a leak.
export const quotedAddress = 'anna@example.ch'

// An error shaped like nodemailer's (its error reference): a code, the SMTP command, and for a server reply
// its numeric code and text. The message, the reply and `rejected` quote the address, as a real refusal does.
export function smtpError(code: string, responseCode?: number): Error {
  const response = responseCode === undefined ? undefined : `${responseCode} 5.1.1 <${quotedAddress}>: Recipient address rejected`
  return Object.assign(new Error(`${code}: ${response ?? 'no reply'} for ${quotedAddress}`), { code, command: 'RCPT TO', responseCode, response, rejected: [quotedAddress] })
}
