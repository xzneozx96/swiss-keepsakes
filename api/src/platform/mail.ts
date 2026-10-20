import type { SmtpConfig } from './config.ts'
import { createTransport } from 'nodemailer'

// The SMTP client (D12). One connection per message: mail is a few messages an hour, so no pool.
export function createSmtpTransport(smtp: SmtpConfig) {
  return createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    // Without implicit TLS, refuse a server that does not upgrade with STARTTLS, so the password never travels in clear.
    requireTLS: !smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
    // nodemailer waits up to 2 min, 30 s and 10 min by default. A stuck attempt should fail and retry long
    // before pg-boss expires the job.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  })
}

export type SmtpTransport = ReturnType<typeof createSmtpTransport>
