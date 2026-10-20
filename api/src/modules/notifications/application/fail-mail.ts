import type { Clock, MailAlert, SentMailRepository, UnitOfWork } from '../ports.ts'

export interface FailMailDeps<T> {
  uow: UnitOfWork<T>
  sentMail: SentMailRepository<T>
  clock: Clock
  alert: MailAlert
}

// Runs for a mail job that pg-boss dead-lettered after its last attempt, including an attempt that timed out.
// The row stays failed in the ops list (docs/ops/mail.md). A second run finds it failed and raises no second alert.
export function makeFailMail<T>({ uow, sentMail, clock, alert }: FailMailDeps<T>) {
  return async (mailId: string): Promise<void> => {
    const failure = await uow.run(tx => sentMail.markFailed(tx, mailId, clock.now()))
    if (failure)
      alert(failure)
  }
}
