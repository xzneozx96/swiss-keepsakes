import type { MailRequest } from '../../src/modules/notifications/application/render-mail.ts'
import { randomUUID } from 'node:crypto'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { createSmtpMailer } from '../../src/modules/notifications/adapters/smtp-mailer.ts'
import { renderMail } from '../../src/modules/notifications/application/render-mail.ts'
import { loadConfig } from '../../src/platform/config.ts'
import { createSmtpTransport } from '../../src/platform/mail.ts'

// The only inbox this suite may send to (owner, 20.10.2026).
const testInbox = 'tuananhngyen218@gmail.com'

const link = 'https://swiss-keepsakes.example/live-check/e2-8'

const accepted = /^250 /

const requests: Record<'N18' | 'N20', (language: 'en' | 'de') => MailRequest> = {
  N18: language => ({ template: 'N18', to: testInbox, language, storeId: null, params: { inviter: 'E2.8 live check', store: 'Swiss Keepsakes test store', link } }),
  N20: language => ({ template: 'N20', to: testInbox, language, storeId: null, params: { store: 'Swiss Keepsakes test store', link } }),
}

function smtpConfig() {
  const loaded = loadConfig(process.env)
  if (!loaded.ok)
    throw new Error(loaded.message)
  if (!loaded.config.smtp)
    throw new Error('Set SMTP_* in api/.env.local or the shell to run the live SMTP suite.')
  return loaded.config.smtp
}

describe('[E2.8] live SMTP: the adapter delivers N18 and N20 to the test inbox', () => {
  it.each([['N18', 'en'], ['N18', 'de'], ['N20', 'en'], ['N20', 'de']] as const)('[E2.8] %s in %s is accepted by the SMTP server', async (template, language) => {
    const smtp = smtpConfig()
    const mail = renderMail(requests[template](language))
    if (mail.to !== testInbox)
      throw new Error('The live suite sends only to the test inbox.')
    const id = randomUUID()

    const { response } = await createSmtpMailer(createSmtpTransport(smtp), smtp.from).send({ id, ...mail })

    expect(response).toMatch(accepted)
    const domain = smtp.from.slice(smtp.from.lastIndexOf('@') + 1)
    // The report quotes these lines. They hold no address and no credential.
    process.stdout.write(`${JSON.stringify({ template, language, messageId: `<${id}@${domain}>`, subject: mail.subject, response })}\n`)
  })
})
