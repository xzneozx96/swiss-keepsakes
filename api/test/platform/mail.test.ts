import type { AddressInfo, Server } from 'node:net'
import { Buffer } from 'node:buffer'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createSmtpTransport } from '../../src/platform/mail.ts'

const servers = new Set<Server>()

afterEach(() => {
  for (const server of servers) server.close()
  servers.clear()
})

// A server that speaks SMTP in clear and does not offer STARTTLS. It records every command it receives.
async function plainSmtpServer() {
  const commands: string[] = []
  const server = createServer((socket) => {
    socket.setEncoding('utf8')
    socket.write('220 plain.test ESMTP\r\n')
    socket.on('data', (chunk: string) => {
      for (const line of chunk.split('\r\n').filter(Boolean)) {
        commands.push(line)
        if (/^EHLO/i.test(line))
          socket.write('250-plain.test\r\n250 AUTH PLAIN LOGIN\r\n')
        else if (/^STARTTLS/i.test(line))
          socket.write('502 5.5.1 STARTTLS not supported\r\n')
        else if (/^QUIT/i.test(line))
          socket.end('221 bye\r\n')
        else
          socket.write('250 OK\r\n')
      }
    })
    socket.on('error', () => {})
  })
  servers.add(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { port: (server.address() as AddressInfo).port, commands }
}

describe('[E2.8] the SMTP client', () => {
  it('[E2.8] with SMTP_SECURE=false it requires STARTTLS and never sends the login to a server without it', async () => {
    const { port, commands } = await plainSmtpServer()
    const transport = createSmtpTransport({ host: '127.0.0.1', port, secure: false, user: 'sender@example.com', password: 'not-a-real-password', from: 'sender@example.com' })

    await expect(transport.sendMail({ from: 'sender@example.com', to: 'lena.meier@example.ch', subject: 'Hello', text: 'Hello' })).rejects.toMatchObject({ code: 'ETLS' })

    expect(commands).toContain('STARTTLS')
    expect(commands.some(command => /^AUTH/i.test(command))).toBe(false)
    expect(commands.join('\n')).not.toContain(Buffer.from('not-a-real-password').toString('base64'))
  })
})
