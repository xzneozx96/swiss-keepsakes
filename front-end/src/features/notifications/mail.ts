import type { Mail } from '@sk/domain/notifications'
import type { DemoState } from '@/features/demo/types'

/** Appends an email to the demo mail log. Ids follow the log length, so they stay unique. */
export function sendMail(state: DemoState, mail: Omit<Mail, 'id'>): DemoState {
  const log = state.data.mail

  return {
    ...state,
    data: {
      ...state.data,
      mail: [...log, { ...mail, id: `mail-${log.length + 1}` }],
    },
  }
}
