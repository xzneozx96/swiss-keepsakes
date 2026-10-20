import type { MailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import type { MailRequest } from '../../src/modules/notifications/application/render-mail.ts'
import type { MailFailure } from '../../src/modules/notifications/ports.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createMailQueues, mailQueues, startMailWorkers } from '../../src/modules/notifications/adapters/jobs.ts'
import { createSentMailRepository } from '../../src/modules/notifications/adapters/sent-mail-repository.ts'
import { makeFailMail } from '../../src/modules/notifications/application/fail-mail.ts'
import { makeQueueMail } from '../../src/modules/notifications/application/queue-mail.ts'
import { makeSendMail } from '../../src/modules/notifications/application/send-mail.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { createMemoryMailer, smtpError } from '../support/memory-mailer.ts'
import { count, openTestDatabase, silentLogger } from './support.ts'

const { pool, db } = openTestDatabase()
let jobs: Awaited<ReturnType<typeof startJobs>>

beforeAll(async () => {
  jobs = await startJobs(inject('databaseUrlUnpooled'), false, silentLogger)
})

afterAll(async () => {
  await jobs.stop()
  await pool.end()
})

const n18: MailRequest = {
  template: 'N18',
  to: 'lena.meier@example.ch',
  language: 'en',
  storeId: '0192f3a0-0000-7000-8000-0000000000cc',
  params: { inviter: 'Ngoc Tran', store: 'Zürich Andenken', link: 'https://swiss-keepsakes.example/store/invitations/7f3c' },
}

// Each test runs on its own queues, so its worker sees only its own jobs.
async function setup(retry = { retryLimit: 2, retryDelay: 0, retryBackoff: false }) {
  const suffix = randomUUID().slice(0, 8)
  const queues: MailQueues = { send: `mail-e2-8-${suffix}`, failed: `mail-failed-e2-8-${suffix}` }
  await createMailQueues(jobs.boss, queues, retry)
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const uow = createUnitOfWork(db)
  const sentMail = createSentMailRepository()
  const memory = createMemoryMailer()
  const alerts: MailFailure[] = []
  const queueMail = makeQueueMail({ sentMail, jobs: createJobQueue(jobs.boss), clock, queue: queues.send })
  const sendMail = makeSendMail({ uow, sentMail, mailer: memory.mailer, clock })
  const failMail = makeFailMail({ uow, sentMail, clock, alert: failure => alerts.push(failure) })
  const startWorkers = () => startMailWorkers(jobs.boss, { sendMail, failMail }, queues)
  const row = async (mailId: string) => (await pool.query('select status, template, language, recipient, attempts, last_error, smtp_response, queued_at, sent_at, failed_at from notifications.sent_mail where id = $1', [mailId])).rows[0]
  return { queues, clock, uow, memory, alerts, queueMail, sendMail, startWorkers, row }
}

async function until(done: () => Promise<boolean> | boolean, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs
  while (!(await done())) {
    if (Date.now() > deadline)
      throw new Error('timed out')
    await sleep(100)
  }
}

describe('[E2.8] the mail job is created in the business transaction', () => {
  it('[E2.8] a committed command leaves one queued sent_mail row and one mail job whose id is the mail id', async () => {
    const { queues, uow, queueMail, row } = await setup()

    const mailId = await uow.run(tx => queueMail(tx, n18))

    expect(await row(mailId)).toMatchObject({ status: 'queued', template: 'N18', language: 'en', recipient: 'lena.meier@example.ch', attempts: 0, queued_at: new Date('2026-10-20T08:00:00Z') })
    const { rows } = await pool.query('select name, data from pgboss.job where id = $1', [mailId])
    expect(rows).toEqual([{ name: queues.send, data: { ...n18, mailId } }])
  })

  it('[E2.8] a rolled-back command leaves no sent_mail row and no job', async () => {
    const { uow, queueMail } = await setup()
    let mailId = ''

    await expect(uow.run(async (tx) => {
      mailId = await queueMail(tx, n18)
      throw new Error('refused after queuing')
    })).rejects.toThrow('refused after queuing')

    expect(mailId).not.toBe('')
    expect(await count(pool, 'select count(*) from notifications.sent_mail where id = $1', [mailId])).toBe(0)
    expect(await count(pool, 'select count(*) from pgboss.job where id = $1', [mailId])).toBe(0)
  })
})

describe('[E2.8] the worker sends queued mail', () => {
  it('[E2.8] sends the mail once through the Mailer with the mail id, and records it sent', async () => {
    const { uow, queueMail, memory, startWorkers, row } = await setup()
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(async () => (await row(mailId))?.status === 'sent')

    expect(memory.sent).toEqual([expect.objectContaining({ id: mailId, to: 'lena.meier@example.ch', subject: 'Ngoc Tran invited you to Zürich Andenken' })])
    expect(await row(mailId)).toMatchObject({ attempts: 1, last_error: null, smtp_response: `250 2.0.0 OK queued as ${mailId}`, sent_at: new Date('2026-10-20T08:00:00Z') })
  })

  it('[E2.8] a job that runs again after its mail was sent sends nothing', async () => {
    const { uow, queueMail, memory, sendMail, row } = await setup()
    const mailId = await uow.run(tx => queueMail(tx, n18))
    await sendMail({ ...n18, mailId })
    const sent = await row(mailId)

    await sendMail({ ...n18, mailId })

    expect(memory.attempts).toHaveLength(1)
    expect(await row(mailId)).toEqual(sent)
  })
})

describe('[E2.8] a failing send retries, then alerts', () => {
  it('[E2.8] every attempt fails, pg-boss retries with the same mail id, then dead-letters it, the row turns failed and one alert is raised', async () => {
    const { queues, uow, queueMail, memory, alerts, startWorkers, row } = await setup()
    memory.failWith(smtpError('ETIMEDOUT'))
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(() => alerts.length > 0)

    expect(memory.attempts.map(mail => mail.id)).toEqual([mailId, mailId, mailId])
    expect(memory.sent).toEqual([])
    expect(alerts).toEqual([{ mailId, template: 'N18', attempts: 3, lastError: 'ETIMEDOUT' }])
    expect(await row(mailId)).toMatchObject({ status: 'failed', attempts: 3, last_error: 'ETIMEDOUT', failed_at: new Date('2026-10-20T08:00:00Z') })
    const { rows: [job] } = await pool.query('select state, retry_count from pgboss.job where id = $1', [mailId])
    expect(job).toEqual({ state: 'failed', retry_count: 2 })
    await until(async () => (await pool.query(`select 1 from pgboss.job where name = $1 and data->>'mailId' = $2 and state = 'completed'`, [queues.failed, mailId])).rowCount === 1)
  })

  it('[E2.8] the real mail queue retries 5 times with exponential backoff and dead-letters to mail-failed', async () => {
    await createMailQueues(jobs.boss)

    expect(await jobs.boss.getQueue(mailQueues.send)).toMatchObject({ retryLimit: 5, retryDelay: 30, retryBackoff: true, deadLetter: mailQueues.failed })
    expect(await jobs.boss.getQueue(mailQueues.failed)).toMatchObject({ name: 'mail-failed' })
  })
})
