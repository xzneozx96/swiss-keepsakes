// What other modules may use (architecture 4.1). A business command queues its mail inside its own uow.run,
// through the function makeQueueMail returns. The composition root builds that function. The identity module
// implements InvitationLink (E2.3), and the composition root passes it to the mail job.
export { makeQueueMail } from './application/queue-mail.ts'
export type { MailParams, MailRequest } from './application/render-mail.ts'
export { invitationRevoked } from './ports.ts'
export type { InvitationLink, InvitationTemplate } from './ports.ts'
