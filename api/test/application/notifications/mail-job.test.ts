import type { MailRequest } from '../../../src/modules/notifications/application/render-mail.ts'
import type { InvitationLink, JobQueue, MailFailure, MailStatus, MailTemplate, QueuedMail, SentMailRepository, UnitOfWork } from '../../../src/modules/notifications/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeFailMail } from '../../../src/modules/notifications/application/fail-mail.ts'
import { makeQueueMail } from '../../../src/modules/notifications/application/queue-mail.ts'
import { makeSendMail } from '../../../src/modules/notifications/application/send-mail.ts'
import { invitationRevoked } from '../../../src/modules/notifications/ports.ts'
import { createManualClock } from '../../support/manual-clock.ts'
import { createMemoryMailer, quotedAddress, smtpError } from '../../support/memory-mailer.ts'

// What pg-boss stores as a failed job's output and copies to its dead-letter job: serialize-error (pg-boss's
// manager.js) keeps every own enumerable property, plus name, message, stack, code, cause and errors.
function storedByPgBoss(error: unknown): string {
  const fields = error as Record<string, unknown>
  const keys = new Set([...Object.keys(fields), 'name', 'message', 'stack', 'code', 'cause', 'errors'])
  return JSON.stringify(Object.fromEntries(Array.from(keys, key => [key, fields[key]])))
}

const n20: Extract<MailRequest, { template: 'N20' }> = {
  template: 'N20',
  to: 'ngoc.tran@example.ch',
  language: 'de',
  storeId: '0192f3a0-0000-7000-8000-0000000000aa',
  params: { store: 'Zürich Andenken', invitationId: '0192f3a0-0000-7000-8000-0000000000ee' },
}

const n20Link = 'https://swiss-keepsakes.example/store/onboarding/tok_7f3c9a'

// In-memory fakes of the module's ports. The transaction is a token the fakes check they were given.
interface FakeTx { open: boolean }

interface Row extends QueuedMail {
  status: MailStatus
  attempts: number
  lastError: string | null
  response: string | null
  sentAt: Date | null
  failedAt: Date | null
}

function createFakes() {
  const rows = new Map<string, Row>()
  const jobs: { queue: string, data: object, id?: string }[] = []
  const alerts: MailFailure[] = []
  const inTx = (tx: FakeTx) => {
    if (!tx.open)
      throw new Error('used outside its transaction')
  }
  const uow: UnitOfWork<FakeTx> = {
    async run(work) {
      const tx = { open: true }
      try {
        return await work(tx)
      }
      finally {
        tx.open = false
      }
    },
  }
  const sentMail: SentMailRepository<FakeTx> = {
    async queue(tx, mail) {
      inTx(tx)
      const id = `0192f3a0-0000-7000-8000-${String(rows.size + 1).padStart(12, '0')}`
      rows.set(id, { ...mail, status: 'queued', attempts: 0, lastError: null, response: null, sentAt: null, failedAt: null })
      return id
    },
    async lockForSend(tx, mailId) {
      inTx(tx)
      return rows.get(mailId)?.status
    },
    async recordSent(tx, mailId, { at, response }) {
      inTx(tx)
      const row = rows.get(mailId)
      if (row?.status === 'queued')
        Object.assign(row, { status: 'sent', attempts: row.attempts + 1, sentAt: at, response })
    },
    async recordAttemptFailed(tx, mailId, error) {
      inTx(tx)
      const row = rows.get(mailId)!
      Object.assign(row, { attempts: row.attempts + 1, lastError: error })
    },
    async recordCancelled(tx, mailId, at) {
      inTx(tx)
      const row = rows.get(mailId)
      if (row?.status === 'queued')
        Object.assign(row, { status: 'failed', failedAt: at, lastError: 'InvitationRevoked' })
    },
    async markFailed(tx, mailId, at) {
      inTx(tx)
      const row = rows.get(mailId)
      if (row?.status !== 'queued')
        return undefined
      Object.assign(row, { status: 'failed', failedAt: at })
      return { mailId, template: row.template, attempts: row.attempts, lastError: row.lastError }
    },
  }
  const jobQueue: JobQueue<FakeTx> = {
    async send(tx, queue, data, options) {
      inTx(tx)
      jobs.push({ queue, data, id: options?.id })
    },
  }
  // Open invitations and the link each one's mail gets. The link holds a token the job data must never hold.
  const invitations = new Map<string, string>()
  const revoked = new Set<string>()
  const linkRequests: { template: MailTemplate, invitationId: string }[] = []
  const invitationLink: InvitationLink<FakeTx> = async (tx, template, invitationId) => {
    inTx(tx)
    linkRequests.push({ template, invitationId })
    if (revoked.has(invitationId))
      return invitationRevoked
    return invitations.get(invitationId)
  }
  return { rows, jobs, alerts, invitations, revoked, linkRequests, uow, sentMail, jobQueue, invitationLink }
}

function setup() {
  const fakes = createFakes()
  fakes.invitations.set(n20.params.invitationId, n20Link)
  const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
  const memory = createMemoryMailer()
  const queueMail = makeQueueMail({ sentMail: fakes.sentMail, jobs: fakes.jobQueue, clock, queue: 'mail' })
  const sendMail = makeSendMail({ uow: fakes.uow, sentMail: fakes.sentMail, mailer: memory.mailer, invitationLink: fakes.invitationLink, clock })
  const failMail = makeFailMail({ uow: fakes.uow, sentMail: fakes.sentMail, clock, alert: failure => fakes.alerts.push(failure), scrub: { scrubSecrets: async () => {} } })
  // A business command that queues one mail in its own transaction, then the job pg-boss would hand over.
  const queued = async <R extends MailRequest>(request: R) => {
    const mailId = await fakes.uow.run(tx => queueMail(tx, request))
    return { mailId, job: { ...request, mailId } }
  }
  return { ...fakes, clock, memory, sendMail, failMail, queued }
}

describe('[E2.8] queueing mail in the business transaction', () => {
  it('[E2.8] writes a queued sent_mail row and a mail job whose id is the mail id, through the caller\'s transaction', async () => {
    const { rows, jobs, queued } = setup()

    const { mailId } = await queued(n20)

    expect(rows.get(mailId)).toMatchObject({ status: 'queued', template: 'N20', language: 'de', recipient: 'ngoc.tran@example.ch', attempts: 0, queuedAt: new Date('2026-10-20T08:00:00Z') })
    expect(jobs).toEqual([{ queue: 'mail', data: { ...n20, mailId }, id: mailId }])
  })

  it.each([
    'ngoc.tran@example.ch, other@example.org',
    'ngoc.tran@example.ch;other@example.org',
    'Ngoc Tran <ngoc.tran@example.ch>',
    'ngoc.tran@example.ch\nBcc: other@example.org',
    '',
  ])('[E2.8] a recipient that is not one plain address (%j) is refused, and no row or job is written', async (to) => {
    const { rows, jobs, queued } = setup()

    await expect(queued({ ...n20, to })).rejects.toThrow('A mail goes to one address only')

    expect(rows.size).toBe(0)
    expect(jobs).toEqual([])
  })
})

describe('[E2.8] the mail job sends through the Mailer port', () => {
  it('[E2.8] renders in the stored language, sends with the mail id, and records the server\'s reply and the time', async () => {
    const { rows, memory, sendMail, queued, clock } = setup()
    const { mailId, job } = await queued(n20)
    clock.advance(2_000)

    await sendMail(job)

    expect(memory.sent).toEqual([expect.objectContaining({ id: mailId, to: 'ngoc.tran@example.ch', subject: 'Einladung: Eröffnen Sie Zürich Andenken' })])
    expect(memory.sent[0]?.text).toContain(n20Link)
    expect(rows.get(mailId)).toMatchObject({ status: 'sent', attempts: 1, response: `250 2.0.0 OK queued as ${mailId}`, sentAt: new Date('2026-10-20T08:00:02Z') })
  })

  it('[E2.8] the job stores the invitation id and no link, and the link is built when the mail is sent, inside the attempt\'s transaction', async () => {
    const { jobs, memory, linkRequests, sendMail, queued } = setup()
    const { job } = await queued(n20)

    expect(jobs[0]?.data).toMatchObject({ params: { invitationId: n20.params.invitationId } })
    expect(JSON.stringify(jobs)).not.toMatch(/https:|tok_/)
    expect(linkRequests).toEqual([])

    await sendMail(job)

    expect(linkRequests).toEqual([{ template: 'N20', invitationId: n20.params.invitationId }])
    expect(memory.sent[0]?.text).toContain(n20Link)
  })

  it('[E2.8] an invitation that is no longer open sends nothing and fails at once', async () => {
    const { rows, memory, invitations, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    invitations.clear()

    await expect(sendMail(job)).rejects.toMatchObject({ message: 'MailRenderError', permanent: true })

    expect(memory.attempts).toEqual([])
    expect(rows.get(mailId)).toMatchObject({ status: 'queued', attempts: 1, lastError: 'MailRenderError' })
  })

  it('[E2.4] a mail for an invitation revoked before it was sent sends nothing, closes the mail without an alert, and the job completes', async () => {
    const { rows, memory, alerts, revoked, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    revoked.add(n20.params.invitationId)

    await expect(sendMail(job)).resolves.toBeUndefined()

    expect(memory.attempts).toEqual([])
    expect(alerts).toEqual([])
    expect(rows.get(mailId)).toMatchObject({ status: 'failed', lastError: 'InvitationRevoked', sentAt: null })
    await sendMail(job)
    expect(memory.attempts).toEqual([])
  })

  it('[E2.8] a job that runs again after its mail was sent sends nothing and changes nothing', async () => {
    const { rows, memory, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    await sendMail(job)
    const after = { ...rows.get(mailId) }

    await sendMail(job)

    expect(memory.attempts).toHaveLength(1)
    expect(rows.get(mailId)).toEqual(after)
  })

  it('[E2.8] a failed send is counted with its code only and thrown again, so pg-boss retries it, and the mail stays queued', async () => {
    const { rows, memory, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    memory.failWith(smtpError('EENVELOPE', 451))

    await expect(sendMail(job)).rejects.toMatchObject({ message: 'EENVELOPE 451' })
    await expect(sendMail(job)).rejects.toMatchObject({ message: 'EENVELOPE 451' })

    expect(memory.attempts.map(mail => mail.id)).toEqual([mailId, mailId])
    expect(rows.get(mailId)).toMatchObject({ status: 'queued', attempts: 2, lastError: 'EENVELOPE 451' })
    expect(JSON.stringify(rows.get(mailId))).not.toContain(quotedAddress)
  })

  it('[E2.8] a failed attempt throws only the error code and SMTP reply code, so pg-boss stores no address or reply text', async () => {
    const { memory, sendMail, queued } = setup()
    const { job } = await queued(n20)
    memory.failWith(smtpError('EENVELOPE', 451))

    const thrown: unknown = await sendMail(job).catch((error: unknown) => error)

    expect(thrown).toMatchObject({ name: 'MailAttemptError', message: 'EENVELOPE 451', code: 'EENVELOPE', responseCode: 451 })
    expect((thrown as Error).cause).toBeUndefined()
    const stored = storedByPgBoss(thrown)
    expect(stored).not.toContain(quotedAddress)
    expect(stored).not.toContain('Recipient address rejected')
    expect(stored).not.toContain('RCPT TO')
  })

  it('[E2.8] a retry after a failure sends with the same mail id and records it sent', async () => {
    const { rows, memory, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    memory.failWith(smtpError('ETIMEDOUT'))
    await expect(sendMail(job)).rejects.toThrow()

    memory.failWith(undefined)
    await sendMail(job)

    expect(memory.sent.map(mail => mail.id)).toEqual([mailId])
    expect(rows.get(mailId)).toMatchObject({ status: 'sent', attempts: 2, lastError: 'ETIMEDOUT' })
  })

  it('[E2.8] a job whose data lacks a template value sends nothing and records the render error', async () => {
    const { rows, memory, sendMail, queued } = setup()
    const { mailId, job } = await queued(n20)

    await expect(sendMail({ ...job, params: { ...job.params, store: '' } })).rejects.toMatchObject({ name: 'MailAttemptError', message: 'MailRenderError', permanent: true })

    expect(memory.attempts).toEqual([])
    expect(rows.get(mailId)).toMatchObject({ status: 'queued', attempts: 1, lastError: 'MailRenderError' })
  })

  it.each([
    ['EAUTH 535', true, smtpError('EAUTH', 535)],
    ['EENVELOPE 550', true, smtpError('EENVELOPE', 550)],
    ['EENVELOPE 451', false, smtpError('EENVELOPE', 451)],
    ['ETIMEDOUT', false, smtpError('ETIMEDOUT')],
  ])('[E2.8] a failed attempt with %s is permanent: %s, because only a 5xx reply can never succeed on a retry', async (lastError, permanent, error) => {
    const { memory, sendMail, queued } = setup()
    const { job } = await queued(n20)
    memory.failWith(error)

    await expect(sendMail(job)).rejects.toMatchObject({ message: lastError, permanent })
  })
})

describe('[E2.8] after the last attempt the mail fails and alerts', () => {
  it('[E2.8] the dead-letter run marks the mail failed and raises one alert with no address or link in it', async () => {
    const { rows, alerts, memory, sendMail, failMail, queued, clock } = setup()
    const { mailId, job } = await queued(n20)
    memory.failWith(smtpError('ECONNECTION'))
    for (let attempt = 0; attempt < 3; attempt++)
      await expect(sendMail(job)).rejects.toThrow()
    clock.advance(60_000)

    await failMail(mailId)
    await failMail(mailId)

    expect(rows.get(mailId)).toMatchObject({ status: 'failed', attempts: 3, failedAt: new Date('2026-10-20T08:01:00Z') })
    expect(alerts).toEqual([{ mailId, template: 'N20', attempts: 3, lastError: 'ECONNECTION' }])
    expect(JSON.stringify(alerts)).not.toMatch(/@example\.ch|https:/)
  })

  it('[E2.8] a mail that was sent is never marked failed and raises no alert', async () => {
    const { rows, alerts, sendMail, failMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    await sendMail(job)

    await failMail(mailId)

    expect(rows.get(mailId)?.status).toBe('sent')
    expect(alerts).toEqual([])
  })

  it('[E2.8] a mail marked failed after its alert is never sent and never turns sent', async () => {
    const { rows, alerts, memory, sendMail, failMail, queued } = setup()
    const { mailId, job } = await queued(n20)
    await failMail(mailId)

    await sendMail(job)

    expect(memory.attempts).toEqual([])
    expect(rows.get(mailId)).toMatchObject({ status: 'failed', attempts: 0, sentAt: null })
    expect(alerts).toHaveLength(1)
  })
})
