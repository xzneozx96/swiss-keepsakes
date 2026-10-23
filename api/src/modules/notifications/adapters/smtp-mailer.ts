import type { SendMailOptions } from 'nodemailer'
import type { Logger } from 'pino'
import type { Mailer } from '../ports.ts'

// The part of the platform's SMTP transport (platform/mail.ts) this adapter uses.
export interface SmtpSender {
  sendMail: (message: SendMailOptions) => Promise<{ response: string }>
}

// The Mailer over SMTP (D12). Nodemailer sends `text` and `html` as multipart/alternative, plain text first, so
// a client that shows no HTML still reads the mail. The Message-ID is the mail id at the sender's domain, as
// section 8 asks, so a repeat after a lost reply carries the same Message-ID.
export function createSmtpMailer(transport: SmtpSender, from: string, fromName: string): Mailer {
  const domain = from.slice(from.lastIndexOf('@') + 1)
  return {
    async send({ id, to, subject, text, html }) {
      const { response } = await transport.sendMail({ from: { name: fromName, address: from }, to, subject, text, html, messageId: `<${id}@${domain}>` })
      return { response }
    },
  }
}

export class SmtpNotConfigured extends Error {
  code = 'ESMTPUNSET'
  override name = 'SmtpNotConfigured'
}

// The Mailer when SMTP_* is unset: every send fails, so the mail retries, then fails and alerts, and stays in
// the ops list. Recording it as sent would hide that nothing left the machine.
export function createUnconfiguredMailer(logger: Logger): Mailer {
  return {
    async send({ id }) {
      logger.warn({ event: 'mail.smtp-unset', mailId: id }, 'mail not sent: SMTP_* is not set')
      throw new SmtpNotConfigured('SMTP_* is not set')
    },
  }
}
