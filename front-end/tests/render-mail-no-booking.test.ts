import type { Mail } from '@sk/domain/notifications'

import { describe, expect, it } from 'vitest'

import { renderMail } from '@/features/notifications/components/render-mail'

describe('stored mail', () => {
  it('[E3.1][AC50] a tour booking mail does not render as a keepsake order mail', () => {
    const mail = { template: 'N07', to: 'guest', language: 'en', bookingId: 'b-1', params: {} } as unknown as Mail
    const { subject, body } = renderMail(mail, [])

    expect(subject).toBe('N07')
    expect([subject, ...body].join(' ')).not.toContain('{')
  })
})
