import type { MailQueues } from '../../src/modules/notifications/adapters/jobs.ts'
import type { MailRequest } from '../../src/modules/notifications/application/render-mail.ts'
import type { InvitationLink, Mailer, MailFailure } from '../../src/modules/notifications/ports.ts'
import type { Tx } from '../../src/platform/db/client.ts'
import { randomUUID } from 'node:crypto'
import { setTimeout as sleep } from 'node:timers/promises'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createMailJobScrubber } from '../../src/modules/notifications/adapters/job-scrubber.ts'
import { createMailQueues, mailQueues, startMailWorkers } from '../../src/modules/notifications/adapters/jobs.ts'
import { createSentMailRepository } from '../../src/modules/notifications/adapters/sent-mail-repository.ts'
import { makeFailMail } from '../../src/modules/notifications/application/fail-mail.ts'
import { makeQueueMail } from '../../src/modules/notifications/application/queue-mail.ts'
import { makeSendMail } from '../../src/modules/notifications/application/send-mail.ts'
import { createUnitOfWork } from '../../src/platform/db/unit-of-work.ts'
import { startJobs } from '../../src/platform/jobs/boss.ts'
import { createJobQueue } from '../../src/platform/jobs/queue.ts'
import { createManualClock } from '../support/manual-clock.ts'
import { createMemoryMailLog } from '../support/memory-mail-log.ts'
import { createMemoryMailer, quotedAddress, smtpError } from '../support/memory-mailer.ts'
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
  params: { inviter: 'Ngoc Tran', store: 'Zürich Andenken', invitationId: '0192f3a0-0000-7000-8000-0000000000dd' },
}

// The identity module builds the real link (E2.3). This one holds a token the job data must never hold.
const n18Link = 'https://swiss-keepsakes.example/store/invitations/tok_5b2e1d'
const invitationLink: InvitationLink<Tx> = async (_tx, _template, invitationId) => (invitationId === n18.params.invitationId ? n18Link : undefined)

// Each test runs on its own queues, so its worker sees only its own jobs.
async function setup(retry = { retryLimit: 2, retryDelay: 0, retryBackoff: false }) {
  const suffix = randomUUID().slice(0, 8)
  const queues: MailQueues = { send: `mail-e2-8-${suffix}`, failed: `mail-failed-e2-8-${suffix}` }
  await createMailQueues(jobs.boss, queues, retry)
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const uow = createUnitOfWork(db)
  const sentMail = createSentMailRepository()
  const memory = createMemoryMailer()
  const mailLog = createMemoryMailLog()
  const alerts: MailFailure[] = []
  const queueMail = makeQueueMail({ sentMail, jobs: createJobQueue(jobs.boss), clock, queue: queues.send })
  const sendMail = makeSendMail({ uow, sentMail, mailer: memory.mailer, invitationLink, clock, log: mailLog.log })
  const failMail = makeFailMail({ uow, sentMail, clock, alert: failure => alerts.push(failure), scrub: createMailJobScrubber(queues) })
  const startWorkers = () => startMailWorkers(jobs.boss, { sendMail, failMail }, queues)
  const row = async (mailId: string) => (await pool.query('select status, template, language, recipient, attempts, last_error, smtp_response, queued_at, sent_at, failed_at from notifications.sent_mail where id = $1', [mailId])).rows[0]
  return { queues, clock, uow, memory, mailLog, alerts, queueMail, sendMail, startWorkers, row }
}

// A Mailer whose sends wait until `release` is called, so a test can hold an attempt in the middle of its send.
function createHeldMailer() {
  const attempts: string[] = []
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const mailer: Mailer = {
    async send(mail) {
      attempts.push(mail.id)
      await released
      return { response: '250 2.0.0 OK' }
    },
  }
  return { mailer, attempts, release: () => release() }
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
    const { uow, queueMail, memory, mailLog, startWorkers, row } = await setup()
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(async () => (await row(mailId))?.status === 'sent')
    expect(mailLog.sent).toEqual([{ mailId, template: 'N18', attempt: 1, response: `250 2.0.0 OK queued as ${mailId}` }])

    expect(memory.sent).toEqual([expect.objectContaining({ id: mailId, to: 'lena.meier@example.ch', subject: 'Ngoc Tran invited you to Zürich Andenken' })])
    expect(await row(mailId)).toMatchObject({ attempts: 1, last_error: null, smtp_response: `250 2.0.0 OK queued as ${mailId}`, sent_at: new Date('2026-10-20T08:00:00Z') })
  })

  it('[E2.8] the job data in pgboss.job holds the invitation id and no link, and the sent mail carries the link built at send time', async () => {
    const { uow, queueMail, memory, startWorkers, row } = await setup()
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(async () => (await row(mailId))?.status === 'sent')

    const { rows: [job] } = await pool.query('select data from pgboss.job where id = $1', [mailId])
    expect(job.data).toMatchObject({ params: { invitationId: n18.params.invitationId } })
    expect(JSON.stringify(job.data)).not.toMatch(/https:|tok_/)
    expect(memory.sent[0]?.text).toContain(n18Link)
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

  it('[E2.8] two runs of the same job at once send it once, because the second waits on the row lock', async () => {
    const { uow, queueMail, clock, row } = await setup()
    const held = createHeldMailer()
    const sendMail = makeSendMail({ uow, sentMail: createSentMailRepository(), mailer: held.mailer, invitationLink, clock, log: createMemoryMailLog().log })
    const mailId = await uow.run(tx => queueMail(tx, n18))

    const first = sendMail({ ...n18, mailId })
    await until(() => held.attempts.length === 1)
    const second = sendMail({ ...n18, mailId })
    await sleep(500)
    held.release()
    await Promise.all([first, second])

    expect(held.attempts).toEqual([mailId])
    expect(await row(mailId)).toMatchObject({ status: 'sent', attempts: 1 })
  })

  it('[E2.8] recording a send leaves a mail that was marked failed as failed', async () => {
    const { uow, queueMail, row } = await setup()
    const sentMail = createSentMailRepository()
    const mailId = await uow.run(tx => queueMail(tx, n18))
    await uow.run(tx => sentMail.markFailed(tx, mailId, new Date('2026-10-20T08:30:00Z')))

    await uow.run(tx => sentMail.recordSent(tx, mailId, { at: new Date('2026-10-20T08:31:00Z'), response: '250 2.0.0 OK' }))

    expect(await row(mailId)).toMatchObject({ status: 'failed', attempts: 0, sent_at: null, smtp_response: null })
  })
})

describe('[E2.8] a failing send retries, then alerts', () => {
  it('[E2.8] every attempt fails, pg-boss retries with the same mail id, then dead-letters it, the row turns failed and one alert is raised', async () => {
    const { queues, uow, queueMail, memory, mailLog, alerts, startWorkers, row } = await setup()
    memory.failWith(smtpError('ETIMEDOUT'))
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(() => alerts.length > 0)
    expect(mailLog.retries.map(({ attempt, error }) => ({ attempt, error }))).toEqual([{ attempt: 1, error: 'ETIMEDOUT' }, { attempt: 2, error: 'ETIMEDOUT' }, { attempt: 3, error: 'ETIMEDOUT' }])
    expect(mailLog.sent).toEqual([])

    expect(memory.attempts.map(mail => mail.id)).toEqual([mailId, mailId, mailId])
    expect(memory.sent).toEqual([])
    expect(alerts).toEqual([{ mailId, template: 'N18', attempts: 3, lastError: 'ETIMEDOUT' }])
    expect(await row(mailId)).toMatchObject({ status: 'failed', attempts: 3, last_error: 'ETIMEDOUT', failed_at: new Date('2026-10-20T08:00:00Z') })
    const { rows: [job] } = await pool.query('select state, retry_count from pgboss.job where id = $1', [mailId])
    expect(job).toEqual({ state: 'failed', retry_count: 2 })
    await until(async () => (await pool.query(`select 1 from pgboss.job where name = $1 and data->>'mailId' = $2 and state = 'completed'`, [queues.failed, mailId])).rowCount === 1)
  })

  it('[E2.8] pg-boss stores a failed attempt and its dead-letter copy with the error code only, never the address or the reply text', async () => {
    const { queues, uow, queueMail, memory, alerts, startWorkers } = await setup()
    memory.failWith(smtpError('EENVELOPE', 451))
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(() => alerts.length > 0)

    const { rows: [source] } = await pool.query('select output from pgboss.job where id = $1', [mailId])
    const { rows: [copy] } = await pool.query('select source_output from pgboss.job where name = $1 and source_id = $2', [queues.failed, mailId])
    for (const stored of [source.output, copy.source_output]) {
      expect(stored).toMatchObject({ name: 'MailAttemptError', message: 'EENVELOPE 451', code: 'EENVELOPE', responseCode: 451 })
      expect(JSON.stringify(stored)).not.toContain(quotedAddress)
      expect(JSON.stringify(stored)).not.toContain('Recipient address rejected')
    }
  })

  it('[E2.2] a failed N01 job and its mail-failed copy hold no sign-in code, and the rest of the job stays for the ops list', async () => {
    const { queues, uow, queueMail, memory, alerts, startWorkers } = await setup()
    memory.failWith(smtpError('EENVELOPE', 550))
    await startWorkers()
    const code = '482913'

    const mailId = await uow.run(tx => queueMail(tx, { template: 'N01', to: 'anna.keller@example.ch', language: 'de', storeId: null, params: { shop: 'Swiss Keepsakes', code } }))
    await until(() => alerts.length > 0)

    const { rows } = await pool.query<{ name: string, row: string }>(`select name, to_jsonb(job)::text as row from pgboss.job where name in ($1, $2) and data->>'mailId' = $3`, [queues.send, queues.failed, mailId])
    expect(rows.map(row => row.name).sort()).toEqual([queues.failed, queues.send].sort())
    for (const { row } of rows) {
      expect(row).not.toContain(code)
      expect(row).toContain(mailId)
    }
    expect(rows.find(row => row.name === queues.failed)?.row).toContain('Swiss Keepsakes')
  })

  it('[E2.8] a permanent refusal (550) skips the retries: one attempt, then mail-failed, the row turns failed and one alert is raised', async () => {
    const { queues, uow, queueMail, memory, alerts, startWorkers, row } = await setup()
    memory.failWith(smtpError('EENVELOPE', 550))
    await startWorkers()

    const mailId = await uow.run(tx => queueMail(tx, n18))
    await until(() => alerts.length > 0)

    expect(memory.attempts.map(mail => mail.id)).toEqual([mailId])
    expect(alerts).toEqual([{ mailId, template: 'N18', attempts: 1, lastError: 'EENVELOPE 550' }])
    expect(await row(mailId)).toMatchObject({ status: 'failed', attempts: 1, last_error: 'EENVELOPE 550' })
    const { rows: [job] } = await pool.query('select state, retry_count from pgboss.job where id = $1', [mailId])
    expect(job).toEqual({ state: 'failed', retry_count: 0 })
    expect(await count(pool, 'select count(*) from pgboss.job where name = $1 and source_id = $2', [queues.failed, mailId])).toBe(1)
  })

  it('[E2.8] the real mail queue retries 5 times with exponential backoff and dead-letters to mail-failed', async () => {
    await createMailQueues(jobs.boss)

    expect(await jobs.boss.getQueue(mailQueues.send)).toMatchObject({ retryLimit: 5, retryDelay: 30, retryBackoff: true, deadLetter: mailQueues.failed })
  })

  it('[E2.8] the real mail-failed queue retries its handler 5 times with exponential backoff, also when it already existed', async () => {
    const existing: MailQueues = { send: `mail-e2-8-${randomUUID().slice(0, 8)}`, failed: `mail-failed-e2-8-${randomUUID().slice(0, 8)}` }
    await jobs.boss.createQueue(existing.failed)

    await createMailQueues(jobs.boss)
    await createMailQueues(jobs.boss, existing)

    for (const name of [mailQueues.failed, existing.failed])
      expect(await jobs.boss.getQueue(name)).toMatchObject({ name, retryLimit: 5, retryDelay: 30, retryBackoff: true })
  })
})
