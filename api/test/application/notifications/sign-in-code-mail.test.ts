import type { JobQueue, QueuedMail, SentMailRepository, UnitOfWork } from '../../../src/modules/notifications/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeQueueMail } from '../../../src/modules/notifications/application/queue-mail.ts'
import { makeSendMail } from '../../../src/modules/notifications/application/send-mail.ts'
import { createManualClock } from '../../support/manual-clock.ts'
import { createMemoryMailer } from '../../support/memory-mailer.ts'

const mailId = '0192f3a0-0000-7000-8000-000000000001'

function fakes() {
  const queued: QueuedMail[] = []
  const jobs: { data: object, options: object | undefined }[] = []
  const uow: UnitOfWork<object> = { run: work => work({}) }
  const sentMail: SentMailRepository<object> = {
    async queue(_tx, mail) {
      queued.push(mail)
      return mailId
    },
    lockForSend: async () => 'queued',
    recordSent: async () => {},
    recordAttemptFailed: async () => {},
    markFailed: async () => undefined,
  }
  const jobQueue: JobQueue<object> = {
    async send(_tx, _queue, data, options) {
      jobs.push({ data, options })
    },
  }
  return { queued, jobs, uow, sentMail, jobQueue }
}

describe('[E2.2] the N01 sign-in code goes through the mail job', () => {
  const request = { template: 'N01', to: 'anna.keller@example.ch', language: 'de', storeId: null, params: { shop: 'Swiss Keepsakes', code: '482913' } } as const

  it('[E2.2] queues a sent_mail row without a store and a job that retries twice and is dropped after 5 minutes, while another template keeps pg-boss\'s defaults', async () => {
    const { queued, jobs, uow, sentMail, jobQueue } = fakes()
    const queueMail = makeQueueMail({ sentMail, jobs: jobQueue, clock: createManualClock(new Date('2026-10-20T08:00:00Z')), queue: 'mail' })
    await uow.run(tx => queueMail(tx, request))
    await uow.run(tx => queueMail(tx, { template: 'N20', to: 'ngoc.tran@example.ch', language: 'en', storeId: '0192f3a0-0000-7000-8000-0000000000aa', params: { store: 'Zürich Andenken', invitationId: '0192f3a0-0000-7000-8000-0000000000ee' } }))

    expect(queued[0]).toMatchObject({ storeId: null, template: 'N01', language: 'de', recipient: 'anna.keller@example.ch' })
    expect(jobs[0]).toEqual({ data: { ...request, mailId }, options: { id: mailId, retryLimit: 2, retryDelay: 20, retryBackoff: false, expireInSeconds: 60, retentionSeconds: 300, deleteAfterSeconds: 3600 } })
    expect(jobs[1]?.options).toEqual({ id: mailId })
  })

  it('[E2.2] the worker renders and sends N01 without asking for an invitation link', async () => {
    const { uow, sentMail } = fakes()
    const memory = createMemoryMailer()
    const linkRequests: string[] = []
    const sendMail = makeSendMail({
      uow,
      sentMail,
      mailer: memory.mailer,
      invitationLink: async (_tx, template) => {
        linkRequests.push(template)
        return undefined
      },
      clock: createManualClock(new Date('2026-10-20T08:00:00Z')),
    })

    await sendMail({ ...request, mailId })

    expect(linkRequests).toEqual([])
    expect(memory.sent).toEqual([expect.objectContaining({ id: mailId, to: 'anna.keller@example.ch', subject: 'Ihr Anmeldecode für Swiss Keepsakes: 482913' })])
  })
})
