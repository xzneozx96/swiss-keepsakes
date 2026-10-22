import { invitationLifetimeMs } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { makeCreateStore } from '../../../src/modules/identity/application/create-store.ts'
import { makeListStores } from '../../../src/modules/identity/application/list-stores.ts'
import { makeResendOwnerInvitation } from '../../../src/modules/identity/application/resend-owner-invitation.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const admin = { userId: 'user-admin' }
const start = new Date('2026-10-20T08:00:00Z')
const input = { slug: 'lucerne-andenken', name: 'Lucerne Andenken', defaultLanguage: 'de' as const, ownerEmail: '  Ngoc.Tran@Example.CH ' }

function setup() {
  const fake = createFakeIdentity()
  const clock = createManualClock(start)
  const deps = { uow: fake.uow, stores: fake.stores, invitations: fake.invitations, conditions: fake.conditions, users: fake.users, admins: fake.admins, queueMail: fake.queueMail, audit: fake.audit, clock }
  return { fake, clock, createStore: makeCreateStore(deps), listStores: makeListStores(deps), resend: makeResendOwnerInvitation(deps) }
}

describe('[E2.3] the Super Admin creates a store with its Owner invitation', () => {
  it('[E2.3][AC03] writes the store as invited and an owner invitation that lives 7 days, for the address in lower case', async () => {
    const { fake, createStore } = setup()

    const result = await createStore(admin, input, 'request-1')

    expect(result).toMatchObject({ ok: true, store: { slug: 'lucerne-andenken', name: 'Lucerne Andenken', status: 'invited', defaultLanguage: 'de', paymentAccount: 'pending' } })
    const [invitation] = [...fake.state.invitations.values()]
    expect(invitation).toMatchObject({ role: 'owner', email: 'ngoc.tran@example.ch', tokenHash: null, acceptedBy: null })
    expect(invitation?.expiresAt.getTime()).toBe(start.getTime() + invitationLifetimeMs)
    expect(invitationLifetimeMs).toBe(7 * 24 * 60 * 60 * 1000)
    expect(result.ok && result.store.invitation).toEqual({ email: 'ngoc.tran@example.ch', state: 'open', expiresAt: '2026-10-27T08:00:00.000Z' })
  })

  it('[E2.3] queues N20 with the invitation id, the store name and the Owner address, and never a token or a link', async () => {
    const { fake, createStore } = setup()

    await createStore(admin, input, null)

    const [invitation] = [...fake.state.invitations.values()]
    const [store] = [...fake.state.stores.values()]
    expect(fake.state.mail).toEqual([{ template: 'N20', to: 'ngoc.tran@example.ch', language: 'de', storeId: store?.id, params: { store: 'Lucerne Andenken', invitationId: invitation?.id } }])
    expect(JSON.stringify(fake.state.mail)).not.toMatch(/token|http|#\//i)
  })

  it('[E2.3] the language of N20 comes from the request and defaults to the store\'s default language', async () => {
    const { fake, createStore } = setup()

    await createStore(admin, { ...input, slug: 'one' }, null)
    await createStore(admin, { ...input, slug: 'two', language: 'en' }, null)

    expect(fake.state.mail.map(mail => mail.language)).toEqual(['de', 'en'])
  })

  it('[E2.3] records the creation in the audit log, without the Owner\'s address', async () => {
    const { fake, createStore } = setup()

    await createStore(admin, input, 'request-1')

    expect(fake.state.audit.map(({ entity, action, actor, requestId }) => ({ entity, action, actor, requestId }))).toEqual([
      { entity: 'store', action: 'created', actor: 'super_admin:user-admin', requestId: 'request-1' },
      { entity: 'store_invitation', action: 'created', actor: 'super_admin:user-admin', requestId: 'request-1' },
    ])
    expect(JSON.stringify(fake.state.audit)).not.toContain('example.ch')
  })

  it('[E2.3] a slug that is taken is refused, and nothing is written or queued', async () => {
    const { fake, createStore } = setup()
    await createStore(admin, input, null)
    const before = { stores: fake.state.stores.size, invitations: fake.state.invitations.size, mail: fake.state.mail.length, audit: fake.state.audit.length }

    expect(await createStore(admin, { ...input, ownerEmail: 'other@example.ch' }, null)).toEqual({ ok: false, reason: 'slug-taken' })

    expect({ stores: fake.state.stores.size, invitations: fake.state.invitations.size, mail: fake.state.mail.length, audit: fake.state.audit.length }).toEqual(before)
  })

  it('[E2.3] an Owner address that belongs to a Super Admin is refused, in any case, and nothing is written', async () => {
    const { fake, createStore } = setup()
    fake.addUser('user-root', 'Ngoc.Tran@example.ch')
    await fake.admins.insertFirst({ id: 0 }, 'user-root')

    expect(await createStore(admin, input, null)).toEqual({ ok: false, reason: 'owner-is-super-admin' })

    expect({ stores: fake.state.stores.size, invitations: fake.state.invitations.size, mail: fake.state.mail.length, audit: fake.state.audit.length }).toEqual({ stores: 0, invitations: 0, mail: 0, audit: 0 })
  })

  it('[E2.3] an Owner address of an ordinary user, or of nobody yet, is accepted', async () => {
    const { fake, createStore } = setup()
    fake.addUser('user-ngoc', 'ngoc.tran@example.ch')

    expect((await createStore(admin, input, null)).ok).toBe(true)
    expect((await createStore(admin, { ...input, slug: 'two', ownerEmail: 'nobody@example.ch' }, null)).ok).toBe(true)
  })

  it('[E2.3] a mail that cannot be queued undoes the store and the invitation', async () => {
    const { fake } = setup()
    const failing = makeCreateStore({ uow: fake.uow, stores: fake.stores, invitations: fake.invitations, conditions: fake.conditions, users: fake.users, admins: fake.admins, queueMail: async () => {
      throw new Error('queue is down')
    }, audit: fake.audit, clock: createManualClock(start) })

    await expect(failing(admin, input, null)).rejects.toThrow('queue is down')

    expect(fake.state.stores.size).toBe(0)
    expect(fake.state.invitations.size).toBe(0)
  })
})

describe('[E2.3] A01\'s list of stores', () => {
  it('[E2.3] shows each store with its newest Owner invitation and its payment account state', async () => {
    const { createStore, listStores } = setup()
    await createStore(admin, input, null)

    const page = await listStores({ limit: 10 })

    expect(page.nextCursor).toBeNull()
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ slug: 'lucerne-andenken', status: 'invited', paymentAccount: 'pending', invitation: { state: 'open', email: 'ngoc.tran@example.ch' } })
  })

  it('[E2.3] an invitation reads expired after 7 days, and open again after a resend', async () => {
    const { clock, createStore, listStores, resend } = setup()
    const created = await createStore(admin, input, null)
    clock.advance(invitationLifetimeMs + 1000)

    expect((await listStores({ limit: 10 })).items[0]?.invitation?.state).toBe('expired')
    const storeId = created.ok ? created.store.id : ''
    await resend(admin, storeId, undefined, null)
    expect((await listStores({ limit: 10 })).items[0]?.invitation?.state).toBe('open')
  })

  it('[E2.3] pages newest first with a cursor, and the last page has none', async () => {
    const { createStore, listStores } = setup()
    for (const slug of ['aa', 'bb', 'cc'])
      await createStore(admin, { ...input, slug }, null)

    const first = await listStores({ limit: 2 })
    const second = await listStores({ limit: 2, cursor: first.nextCursor ?? undefined })

    expect(first.items.map(item => item.slug)).toEqual(['cc', 'bb'])
    expect(first.nextCursor).toBe(first.items[1]?.id)
    expect(second.items.map(item => item.slug)).toEqual(['aa'])
    expect(second.nextCursor).toBeNull()
  })

  it('[E2.3] a store with no Owner invitation has none in the list', async () => {
    const { fake, listStores } = setup()
    fake.addStore({ slug: 'bare' })

    expect((await listStores({ limit: 10 })).items[0]?.invitation).toBeNull()
  })
})

describe('[E2.3] the Super Admin resends the Owner invitation', () => {
  it('[E2.3] starts the 7 days again, clears the old token, and queues N20 for the same invitation', async () => {
    const { fake, clock, createStore, resend } = setup()
    const created = await createStore(admin, input, null)
    const storeId = created.ok ? created.store.id : ''
    const [invitation] = [...fake.state.invitations.values()]
    fake.state.invitations.get(invitation?.id ?? '')!.tokenHash = 'hash-of-the-old-link'
    clock.advance(3 * 24 * 60 * 60 * 1000)

    const result = await resend(admin, storeId, undefined, 'request-2')

    expect(result.ok).toBe(true)
    expect(fake.state.invitations.size).toBe(1)
    expect(fake.state.invitations.get(invitation?.id ?? '')).toMatchObject({ tokenHash: null })
    expect(fake.state.invitations.get(invitation?.id ?? '')?.expiresAt.getTime()).toBe(clock.now().getTime() + invitationLifetimeMs)
    expect(fake.state.mail).toHaveLength(2)
    expect(fake.state.mail[1]).toMatchObject({ template: 'N20', to: 'ngoc.tran@example.ch', params: { invitationId: invitation?.id } })
    expect(JSON.stringify(fake.state.mail)).not.toMatch(/token|http/i)
    expect(fake.state.audit.at(-1)).toMatchObject({ entity: 'store_invitation', action: 'resent', requestId: 'request-2' })
  })

  it('[E2.3] is refused for a revoked invitation, and queues nothing', async () => {
    const { fake, createStore, resend } = setup()
    const created = await createStore(admin, input, null)
    const storeId = created.ok ? created.store.id : ''
    for (const invitation of fake.state.invitations.values())
      invitation.revokedAt = new Date(start.getTime())

    expect(await resend(admin, storeId, undefined, null)).toEqual({ ok: false, reason: 'invitation-revoked' })
    expect(fake.state.mail).toHaveLength(1)
  })

  it('[E2.3] takes the language from the request, and the store\'s default language otherwise', async () => {
    const { fake, createStore, resend } = setup()
    const created = await createStore(admin, { ...input, language: 'en' }, null)
    const storeId = created.ok ? created.store.id : ''

    await resend(admin, storeId, undefined, null)
    await resend(admin, storeId, 'en', null)

    expect(fake.state.mail.map(mail => mail.language)).toEqual(['en', 'de', 'en'])
  })

  it('[E2.3] is refused once the Owner has accepted, and queues nothing', async () => {
    const { fake, createStore, resend } = setup()
    const created = await createStore(admin, input, null)
    const storeId = created.ok ? created.store.id : ''
    for (const invitation of fake.state.invitations.values())
      invitation.acceptedBy = 'user-owner'

    expect(await resend(admin, storeId, undefined, null)).toEqual({ ok: false, reason: 'invitation-already-accepted' })
    expect(fake.state.mail).toHaveLength(1)
  })

  it('[E2.3] answers that a store is missing, or that it has no Owner invitation', async () => {
    const { fake, resend } = setup()
    const bare = fake.addStore({ slug: 'bare' })

    expect(await resend(admin, '0190f0c2-0000-7000-8000-0000000000ff', undefined, null)).toEqual({ ok: false, reason: 'store-not-found' })
    expect(await resend(admin, bare.id, undefined, null)).toEqual({ ok: false, reason: 'invitation-not-found' })
  })
})
