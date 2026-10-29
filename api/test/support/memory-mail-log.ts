import type { MailLog } from '../../src/modules/notifications/ports.ts'

// The in-memory MailLog for tests: `sent` and `retries` hold what the mail job reported, in order.
export function createMemoryMailLog() {
  const sent: Parameters<MailLog['sent']>[0][] = []
  const retries: Parameters<MailLog['retry']>[0][] = []
  const log: MailLog = {
    sent: attempt => sent.push(attempt),
    retry: attempt => retries.push(attempt),
  }
  return { log, sent, retries }
}
