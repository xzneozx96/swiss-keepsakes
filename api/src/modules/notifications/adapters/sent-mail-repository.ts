import type { Tx } from '../../../platform/db/client.ts'
import type { MailTemplate, SentMailRepository } from '../ports.ts'
import { and, eq, sql } from 'drizzle-orm'
import { cancelledError } from '../ports.ts'
import { sentMail } from './schema.ts'

export function createSentMailRepository(): SentMailRepository<Tx> {
  return {
    async queue(tx, mail) {
      const [row] = await tx.insert(sentMail).values(mail).returning({ id: sentMail.id })
      if (!row)
        throw new Error('sent_mail insert returned no row')
      return row.id
    },

    async lockForSend(tx, mailId) {
      const [row] = await tx.select({ status: sentMail.status }).from(sentMail).where(eq(sentMail.id, mailId)).for('update')
      return row?.status
    },

    async recordSent(tx, mailId, { at, response }) {
      const [row] = await tx.update(sentMail)
        .set({ status: 'sent', attempts: sql`${sentMail.attempts} + 1`, sentAt: at, smtpResponse: response })
        .where(and(eq(sentMail.id, mailId), eq(sentMail.status, 'queued')))
        .returning({ attempts: sentMail.attempts })
      return row?.attempts
    },

    async recordAttemptFailed(tx, mailId, error) {
      const [row] = await tx.update(sentMail)
        .set({ attempts: sql`${sentMail.attempts} + 1`, lastError: error })
        .where(eq(sentMail.id, mailId))
        .returning({ attempts: sentMail.attempts })
      return row?.attempts
    },

    async recordCancelled(tx, mailId, at) {
      await tx.update(sentMail)
        .set({ status: 'failed', failedAt: at, lastError: cancelledError })
        .where(and(eq(sentMail.id, mailId), eq(sentMail.status, 'queued')))
    },

    async markFailed(tx, mailId, at) {
      const [row] = await tx.update(sentMail)
        .set({ status: 'failed', failedAt: at })
        .where(and(eq(sentMail.id, mailId), eq(sentMail.status, 'queued')))
        .returning({ template: sentMail.template, attempts: sentMail.attempts, lastError: sentMail.lastError })
      return row && { mailId, template: row.template as MailTemplate, attempts: row.attempts, lastError: row.lastError }
    },
  }
}
