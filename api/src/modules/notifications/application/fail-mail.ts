import type { Clock, MailAlert, MailJobScrubber, SentMailRepository, UnitOfWork } from '../ports.ts'

export interface FailMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  clock: Clock
  alert: MailAlert
  scrub: MailJobScrubber<T>
}

// Runs for a mail job that pg-boss dead-lettered after its last attempt, including an attempt that timed out,
// or at once after a permanent failure.
// The sign-in code is scrubbed from the job data here, so the dead-letter copy in mail-failed holds none (a second
// run scrubs again and changes nothing). The row stays failed in the ops list (docs/ops/mail.md). A second run finds it failed and raises no second alert.
export function makeFailMail<T>({ uow, sentMail, clock, alert, scrub }: FailMailDeps<T>) {
  return async (mailId: string): Promise<void> => {
    const failure = await uow.run(async (tx) => {
      await scrub.scrubSecrets(tx, mailId)
      return sentMail.markFailed(tx, mailId, clock.now())
    })
    if (failure)
      alert(failure)
  }
}
