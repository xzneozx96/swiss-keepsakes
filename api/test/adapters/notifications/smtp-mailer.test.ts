import type { SmtpSender } from '../../../src/modules/notifications/adapters/smtp-mailer.ts'
import { Buffer } from 'node:buffer'
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

function decodeQuotedPrintable(value: string): string {
  const joined = value.replaceAll(/=\r?\n/g, '')
  const bytes = joined.split(/(=[\dA-F]{2})/).flatMap(piece => /^=[\dA-F]{2}$/.test(piece) ? [Number.parseInt(piece.slice(1), 16)] : [...Buffer.from(piece, 'latin1')])
  return Buffer.from(bytes).toString('utf8')
}

// The leaf parts of a multipart message, with each part's content type and decoded body.
function mimeParts(message: string): Array<{ type: string, body: string }> {
  const boundary = /^Content-Type: multipart\/alternative;\s+boundary="?([^"\n]+)"?/m.exec(message)?.[1]
  if (!boundary)
    return [{ type: /^Content-Type: ([^;\n]+)/m.exec(message)?.[1] ?? '', body: message.slice(message.indexOf('\n\n') + 2) }]
  return message.split(`--${boundary}`).slice(1, -1).map((part) => {
    const [head = '', ...rest] = part.replace(/^\n/, '').split('\n\n')
    const raw = rest.join('\n\n').replace(/\n$/, '')
    const encoding = /^Content-Transfer-Encoding: (.+)$/m.exec(head)?.[1]?.trim()
    const body = encoding === 'quoted-printable'
      ? decodeQuotedPrintable(raw)
      : encoding === 'base64' ? Buffer.from(raw, 'base64').toString('utf8') : raw
    return { type: /^Content-Type: ([^;\n]+)/m.exec(head)?.[1] ?? '', body }
  })
}

describe('[E2.8] SMTP adapter', () => {
  it('[E2.4] a display name with markup and a line break stays inert in both parts: escaped in the HTML, typed in the text, no extra header and no third part', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com', 'Swiss Keepsakes')
    const rendered = renderMail({ template: 'N18', to: 'lena.meier@example.ch', language: 'en', storeId: null, params: { inviter: '<b>Ngoc</b> <img src=x onerror=alert(1)>\r\nBcc: evil@example.ch', store: 'Lucerne Gifts', invitationId: mailId } }, 'https://swiss-keepsakes.example/i/7f3c')

    await mailer.send({ id: mailId, ...rendered })

    const [message = ''] = messages
    const headers = message.slice(0, message.indexOf('\n\n'))
    expect(headers).not.toMatch(/^Bcc:/im)
    expect(headers).toMatch(/^Content-Type: multipart\/alternative;/m)
    const parts = mimeParts(message)
    expect(parts.map(part => part.type)).toEqual(['text/plain', 'text/html'])
    expect(parts[0]?.body).toContain('<b>Ngoc</b> <img src=x onerror=alert(1)>')
    const html = parts[1]?.body ?? ''
    expect(html).toContain('&lt;b&gt;Ngoc&lt;/b&gt; &lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toMatch(/<b>|<img/i)
  })

  it('[E2.8] sends the text and the HTML of one mail as multipart/alternative, plain text first', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com', 'Swiss Keepsakes')
    const rendered = renderMail({ template: 'N01', to: 'anna.keller@example.ch', language: 'de', storeId: null, params: { shop: 'Swiss Keepsakes', code: '482913' } }, undefined)

    await mailer.send({ id: mailId, ...rendered })

    const parts = mimeParts(messages[0] ?? '')
    expect(parts.map(part => part.type)).toEqual(['text/plain', 'text/html'])
    expect(parts[0]?.body).toBe(rendered.text)
    expect(parts[1]?.body).toBe(rendered.html)
  })

  it('[E2.8] a repeat of the same mail carries the same text and HTML', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com', 'Swiss Keepsakes')
    const request = { template: 'N20', to: 'ngoc.tran@example.ch', language: 'en', storeId: null, params: { store: 'Zürich Andenken', invitationId: mailId, expiresOn: '2026-11-05T09:00:00.000Z' } } as const

    await mailer.send({ id: mailId, ...renderMail(request, 'https://swiss-keepsakes.example/i/7f3c') })
    await mailer.send({ id: mailId, ...renderMail(request, 'https://swiss-keepsakes.example/i/7f3c') })

    const [first, second] = messages.map(message => mimeParts(message).map(part => part.body))
    expect(first).toEqual(second)
  })

  it('[E2.8] sends from SMTP_FROM, named SMTP_FROM_NAME, to the recipient, with the mail id at the sender\'s domain as Message-ID', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com', 'Swiss Keepsakes')

    const result = await mailer.send({ id: mailId, to: 'lena.meier@example.ch', subject: 'Ngoc Tran invited you to Lucerne Gifts', text: 'Hello,\n\nOpen it: https://swiss-keepsakes.example/i/7f3c', html: '<p>Hello</p>' })

    expect(result).toEqual({ response: '250 2.0.0 OK' })
    const [message = ''] = messages
    const headers = message.slice(0, message.indexOf('\n\n'))
    expect(headers).toMatch(/^Message-ID: <0192f3a0-0000-7000-8000-0000000000bb@gmail\.com>$/m)
    expect(headers).toMatch(/^From: Swiss Keepsakes <keepsakes\.test@gmail\.com>$/m)
    expect(headers).toMatch(/^To: lena\.meier@example\.ch$/m)
    expect(headers).toMatch(/^Subject: Ngoc Tran invited you to Lucerne Gifts$/m)
    expect(headers).toMatch(/^Content-Type: multipart\/alternative;/m)
    expect(message).toContain('https://swiss-keepsakes.example/i/7f3c')
  })

  it('[E2.8] a repeat of the same mail carries the same Message-ID', async () => {
    const { transport, messages } = capturingTransport()
    const mailer = createSmtpMailer(transport, 'keepsakes.test@gmail.com', 'Swiss Keepsakes')
    const mail = { id: mailId, to: 'lena.meier@example.ch', subject: 'Hello', text: 'Hello', html: '<p>Hello</p>' }

    await mailer.send(mail)
    await mailer.send(mail)

    const ids = messages.map(message => /^Message-ID: (.+)$/m.exec(message)?.[1])
    expect(ids).toEqual([`<${mailId}@gmail.com>`, `<${mailId}@gmail.com>`])
  })

  it('[E2.8] without SMTP_* every send fails with ESMTPUNSET and logs a warning without the address', async () => {
    const lines: string[] = []
    const mailer = createUnconfiguredMailer(createLogger('info', { write: line => lines.push(line) }))

    await expect(mailer.send({ id: mailId, to: 'lena.meier@example.ch', subject: 'Hello', text: 'Hello', html: '<p>Hello</p>' })).rejects.toMatchObject({ code: 'ESMTPUNSET' })

    expect(lines.map(line => JSON.parse(line))).toEqual([expect.objectContaining({ level: 40, event: 'mail.smtp-unset', mailId })])
    expect(lines.join('')).not.toContain('example.ch')
  })
})
