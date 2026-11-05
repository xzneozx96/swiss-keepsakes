import { beforeEach, describe, expect, it, vi } from 'vitest'

import { syncIdentity } from '@/features/auth/lib/session-sync'
import { startDemo } from '@/features/demo/data-client'
import { demoGuest } from '@/features/orders/seed'

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(null)))
})

async function signedIn() {
  const demo = startDemo()

  await demo.ready
  return demo
}
const guestOf = (demo: Awaited<ReturnType<typeof signedIn>>) => demo.store.getState().data.guests.find(g => g.id === demoGuest.id)

describe('the account shows who is signed in (owner, 05.11.2026)', () => {
  it('takes the session\'s name, email and photo instead of the demo guest\'s', async () => {
    const demo = await signedIn()

    syncIdentity(demo.store, { name: 'Tuan Anh', email: 'tuan@example.ch', image: 'https://example.ch/me.jpg' })

    expect(guestOf(demo)).toMatchObject({ name: 'Tuan Anh', email: 'tuan@example.ch', avatar: 'https://example.ch/me.jpg' })
  })

  it('uses the email as the name when the session has none, and no photo when it has none', async () => {
    const demo = await signedIn()

    syncIdentity(demo.store, { email: 'guest@example.ch', image: null })

    expect(guestOf(demo)).toMatchObject({ name: 'guest@example.ch', email: 'guest@example.ch' })
    expect(guestOf(demo)?.avatar).toBeUndefined()
  })

  it('does not write the store when nothing changed', async () => {
    const demo = await signedIn()

    syncIdentity(demo.store, { name: 'Tuan Anh', email: 'tuan@example.ch' })
    const before = demo.store.getState()
    syncIdentity(demo.store, { name: 'Tuan Anh', email: 'tuan@example.ch' })

    expect(demo.store.getState()).toBe(before)
  })
})
