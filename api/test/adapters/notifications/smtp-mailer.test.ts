import type { SmtpSender } from '../../../src/modules/notifications/adapters/smtp-mailer.ts'
import { createTransport } from 'nodemailer'
import { describe, expect, it } from 'vitest'
import { createSmtpMailer, createUnconfiguredMailer } from '../../../src/modules/notifications/adapters/smtp-mailer.ts'
import { renderMail } from '../../../src/modules/notifications/application/render-mail.ts'
import { createLogger } from '../../../src/platform/logger.ts'

const mailId = '0192f3a0-0000-7000-8000-0000000000bb'

// nodemailer's stream transport builds the exact message the SMTP transport would send, without a server.
function capturingTransport() {
  const stream = createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
  const messages: string[] = []
  const transport: SmtpSender = {
    async sendMail(message) {
      const info = await stream.sendMail(message)
      messages.push(String(info.message))
      return { response: '250 2.0.0 OK' }
    },
  }
  return { transport, messages }
}

describe('[E2.8] SMTP adapter', () => {
  it('[E2.4] a display name with markup and a line break goes out as plain text, with no HTML part and no extra header', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com')
    const rendered = renderMail({ template: 'N18', to: 'lena.meier@example.ch', language: 'en', storeId: null, params: { inviter: '<b>Ngoc</b> <img src=x onerror=alert(1)>\r\nBcc: evil@example.ch', store: 'Lucerne Gifts', invitationId: mailId } }, 'https://swiss-keepsakes.example/i/7f3c')

    await mailer.send({ id: mailId, ...rendered })

    const [message = ''] = messages
    const headers = message.slice(0, message.indexOf('\n\n'))
    expect(headers).not.toMatch(/^Bcc:/im)
    expect(headers).toMatch(/^Content-Type: text\/plain; charset=utf-8$/m)
    expect(message).not.toMatch(/text\/html/i)
    expect(message).toContain('<b>Ngoc</b> <img src=x onerror=alert(1)>')
  })

  it('[E2.8] sends from SMTP_FROM to the recipient, with the mail id at the sender\'s domain as Message-ID', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com')

    const result = await mailer.send({ id: mailId, to: 'lena.meier@example.ch', subject: 'Ngoc Tran invited you to Lucerne Gifts', text: 'Hello,\n\nOpen it: https://swiss-keepsakes.example/i/7f3c' })

    expect(result).toEqual({ response: '250 2.0.0 OK' })
    const [message = ''] = messages
    const headers = message.slice(0, message.indexOf('\n\n'))
    expect(headers).toMatch(/^Message-ID: <0192f3a0-0000-7000-8000-0000000000bb@gmail\.com>$/m)
    expect(headers).toMatch(/^From: keepsakes\.test@gmail\.com$/m)
    expect(headers).toMatch(/^To: lena\.meier@example\.ch$/m)
    expect(headers).toMatch(/^Subject: Ngoc Tran invited you to Lucerne Gifts$/m)
    expect(headers).toMatch(/^Content-Type: text\/plain; charset=utf-8$/m)
    expect(message).toContain('https://swiss-keepsakes.example/i/7f3c')
  })

  it('[E2.8] a repeat of the same mail carries the same Message-ID', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com')
    const mail = { id: mailId, to: 'lena.meier@example.ch', subject: 'Hello', text: 'Hello' }

    await mailer.send(mail)
    await mailer.send(mail)

    const ids = messages.map(message => /^Message-ID: (.+)$/m.exec(message)?.[1])
    expect(ids).toEqual([`<${mailId}@gmail.com>`, `<${mailId}@gmail.com>`])
  })

  it('[E2.8] without SMTP_* every send fails with ESMTPUNSET and logs a warning without the address', async () => {
    const lines: string[] = []
    const mailer = createUnconfiguredMailer(createLogger('info', { write: line => lines.push(line) }))

    await expect(mailer.send({ id: mailId, to: 'lena.meier@example.ch', subject: 'Hello', text: 'Hello' })).rejects.toMatchObject({ code: 'ESMTPUNSET' })

    expect(lines.map(line => JSON.parse(line))).toEqual([expect.objectContaining({ level: 40, event: 'mail.smtp-unset', mailId })])
    expect(lines.join('')).not.toContain('example.ch')
  })
})
