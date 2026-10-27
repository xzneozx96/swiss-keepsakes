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

// The N01 code is fake. The link is the shape InvitationLink builds, with a fake token.
const link = 'https://swiss-keepsakes.example/invitation#invitation=live-check-fake-token-not-valid'

const invitationId = '00000000-0000-7000-8000-00000000e208'

const accepted = /^250 /

const requests: Record<'N01' | 'N18' | 'N20', (language: 'en' | 'de') => MailRequest> = {
  N01: language => ({ template: 'N01', to: testInbox, language, storeId: null, params: { shop: 'Swiss Keepsakes', code: '000000' } }),
  N18: language => ({ template: 'N18', to: testInbox, language, storeId: null, params: { inviter: 'E2.8 live check', store: 'Swiss Keepsakes test store', invitationId } }),
  N20: language => ({ template: 'N20', to: testInbox, language, storeId: null, params: { store: 'Swiss Keepsakes test store', invitationId } }),
}

function smtpConfig() {
  const loaded = loadConfig(process.env)
  if (!loaded.ok)
    throw new Error(loaded.message)
  if (!loaded.config.smtp)
    throw new Error('Set SMTP_* in api/.env.local or the shell to run the live SMTP suite.')
  return loaded.config.smtp
}

describe('[E2.8] live SMTP: the adapter delivers N01, N18 and N20 to the test inbox', () => {
  it.each([['N01', 'en'], ['N01', 'de'], ['N18', 'en'], ['N18', 'de'], ['N20', 'en'], ['N20', 'de']] as const)('[E2.8] %s in %s is accepted by the SMTP server', async (template, language) => {
    const smtp = smtpConfig()
    const mail = renderMail(requests[template](language), template === 'N01' ? undefined : link)
    if (mail.to !== testInbox)
      throw new Error('The live suite sends only to the test inbox.')
    const id = randomUUID()

    const { response } = await createSmtpMailer(createSmtpTransport(smtp), smtp.from, smtp.fromName).send({ id, ...mail })

    expect(response).toMatch(accepted)
    const domain = smtp.from.slice(smtp.from.lastIndexOf('@') + 1)
    // The report quotes these lines. They hold no address and no credential.
    process.stdout.write(`${JSON.stringify({ template, language, messageId: `<${id}@${domain}>`, subject: mail.subject, response })}\n`)
  })
})
