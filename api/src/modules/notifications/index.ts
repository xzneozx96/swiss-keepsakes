// What other modules may use (architecture 4.1). A business command queues its mail inside its own uow.run,
// through the function makeQueueMail returns. The composition root builds that function.
export { makeQueueMail } from './application/queue-mail.ts'
export type { MailParams, MailRequest } from './application/render-mail.ts'
