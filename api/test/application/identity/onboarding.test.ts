import type { Actor } from '@sk/domain/identity'
import { actorFor } from '@sk/domain/identity'
import { describe, expect, it } from 'vitest'
import { createPendingConditions } from '../../../src/modules/identity/adapters/pending-conditions.ts'
import { makeGetOnboarding } from '../../../src/modules/identity/application/get-onboarding.ts'
import { makeOpenStoreForSale } from '../../../src/modules/identity/application/open-store-for-sale.ts'
import { makeStoreMaySell } from '../../../src/modules/identity/application/store-may-sell.ts'
import { makeUpdateStoreInformation } from '../../../src/modules/identity/application/update-store-information.ts'
import { createFakeIdentity } from '../../support/fake-identity.ts'
import { createManualClock } from '../../support/manual-clock.ts'

const clock = createManualClock(new Date('2026-10-20T08:00:00Z'))
const person = (userId: string) => ({ userId, guestId: `guest-of-${userId}` })

function setup(status: 'invited' | 'onboarding' | 'live' | 'suspended' = 'onboarding') {
  const fake = createFakeIdentity()
  const store = fake.addStore({ slug: 'lucerne', status })
  const owner = actorFor(person('owner'), { platformAdmin: false, memberships: [{ storeId: store.id, role: 'owner' }] })
  const manager = actorFor(person('manager'), { platformAdmin: false, memberships: [{ storeId: store.id, role: 'manager' }] })
  const deps = { uow: fake.uow, stores: fake.stores, conditions: fake.conditions, audit: fake.audit, clock }
  return { fake, store, owner, manager, getOnboarding: makeGetOnboarding(deps), open: makeOpenStoreForSale(deps), update: makeUpdateStoreInformation(deps), maySell: makeStoreMaySell(deps) }
}

const allMet = { 'payment-account': 'met', 'catalogue': 'met', 'policies': 'met' } as const

describe('[E2.3][AC03] A02\'s four conditions', () => {
  it('[E2.3][AC03] lists all four: the store information is computed, the other three are pending until their stories land', async () => {
    const { store, getOnboarding } = setup()

    expect(await getOnboarding(store.id)).toEqual({
      store: { id: store.id, slug: 'lucerne', name: 'Zürich Andenken', status: 'onboarding', defaultLanguage: 'en' },
      conditions: [
        { key: 'store-information', state: 'met' },
        { key: 'payment-account', state: 'pending' },
        { key: 'catalogue', state: 'pending' },
        { key: 'policies', state: 'pending' },
      ],
      mayOpenForSale: false,
    })
  })

  it('[E2.3][AC03] the named pending source answers pending for each later condition', async () => {
    expect(await createPendingConditions().laterConditions({}, 'any-store')).toEqual({ 'payment-account': 'pending', 'catalogue': 'pending', 'policies': 'pending' })
  })

  it('[E2.3][AC03] with every later condition met, the store may open', async () => {
    const { fake, store, getOnboarding } = setup()
    fake.setLater(allMet)

    expect(await getOnboarding(store.id)).toMatchObject({ mayOpenForSale: true })
  })

  it('[E2.3] a store that is missing reads as undefined', async () => {
    const { getOnboarding } = setup()

    expect(await getOnboarding('0190f0c2-0000-7000-8000-0000000000ff')).toBeUndefined()
  })
})

describe('[E2.3][AC03] opening for sale', () => {
  it('[E2.3][AC03] is refused while any condition is unmet, and the store stays onboarding and out of live', async () => {
    const { fake, store, owner, open } = setup()

    expect(await open(owner, store.id, null)).toEqual({ ok: false, reason: 'onboarding-incomplete' })
    expect(fake.state.stores.get(store.id)?.status).toBe('onboarding')
    expect(fake.state.audit).toEqual([])
  })

  it.each(['payment-account', 'catalogue', 'policies'] as const)('[E2.3][AC03] is refused when only %s is not met, whether it is pending or unmet', async (key) => {
    for (const state of ['pending', 'unmet'] as const) {
      const { fake, store, owner, open } = setup()
      fake.setLater({ ...allMet, [key]: state })

      expect(await open(owner, store.id, null)).toEqual({ ok: false, reason: 'onboarding-incomplete' })
      expect(fake.state.stores.get(store.id)?.status).toBe('onboarding')
    }
  })

  it('[E2.3][AC03] is refused when the store information is not met, though the three later ones are', async () => {
    const { fake, store, owner, open } = setup()
    fake.setLater(allMet)
    fake.state.stores.get(store.id)!.name = '   '

    expect(await open(owner, store.id, null)).toEqual({ ok: false, reason: 'onboarding-incomplete' })
  })

  it('[E2.3][AC03] succeeds with every condition met: the store goes live and the change is audited', async () => {
    const { fake, store, owner, open, maySell } = setup()
    fake.setLater(allMet)
    expect(await maySell({ id: 0 }, store.id)).toBe(false)

    expect(await open(owner, store.id, 'request-9')).toEqual({ ok: true, store: { ...store, status: 'live' } })
    expect(fake.state.stores.get(store.id)?.status).toBe('live')
    expect(fake.state.audit).toEqual([expect.objectContaining({ storeId: store.id, entity: 'store', action: 'status-changed', before: { status: 'onboarding' }, after: { status: 'live' }, actor: 'staff:owner', requestId: 'request-9' })])
    expect(await maySell({ id: 0 }, store.id)).toBe(true)
  })

  it('[E2.3][AC03] only the Owner may: a Manager of the store is refused even with every condition met', async () => {
    const { fake, store, manager, open } = setup()
    fake.setLater(allMet)

    expect(await open(manager, store.id, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(fake.state.stores.get(store.id)?.status).toBe('onboarding')
  })

  it.each([
    ['a guest', actorFor(person('guest'), { platformAdmin: false, memberships: [] })],
    ['the Super Admin', actorFor(person('admin'), { platformAdmin: true, memberships: [] })],
    ['an anonymous caller', { kind: 'anonymous' } as Actor],
  ])('[E2.3][AC03] %s is refused', async (_, actor) => {
    const { fake, store, open } = setup()
    fake.setLater(allMet)

    expect(await open(actor, store.id, null)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('[E2.3][AC03] the Owner of another store is refused', async () => {
    const { fake, store, open } = setup()
    fake.setLater(allMet)
    const elsewhere = actorFor(person('zug'), { platformAdmin: false, memberships: [{ storeId: '0190f0c2-0000-7000-8000-0000000000bb', role: 'owner' }] })

    expect(await open(elsewhere, store.id, null)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it.each(['invited', 'live', 'suspended'] as const)('[E2.3][AC03] a store that is %s cannot be opened, whatever its conditions', async (status) => {
    const { fake, store, owner, open } = setup(status)
    fake.setLater(allMet)

    expect(await open(owner, store.id, null)).toEqual({ ok: false, reason: 'store-not-onboarding' })
    expect(fake.state.stores.get(store.id)?.status).toBe(status)
  })

  it('[E2.3] a store that is missing cannot be opened', async () => {
    const { fake, owner, open } = setup()
    fake.setLater(allMet)
    const ghost = actorFor(person('ghost'), { platformAdmin: false, memberships: [{ storeId: '0190f0c2-0000-7000-8000-0000000000ff', role: 'owner' }] })

    expect(await open(ghost, '0190f0c2-0000-7000-8000-0000000000ff', null)).toEqual({ ok: false, reason: 'store-not-found' })
    expect(owner.kind).toBe('staff')
  })
})

describe('[E2.3] a store may sell only when it is live', () => {
  it.each([['invited', false], ['onboarding', false], ['live', true], ['suspended', false]] as const)('[E2.3][AC03] %s: %s', async (status, sells) => {
    const { store, maySell } = setup(status)

    expect(await maySell({ id: 0 }, store.id)).toBe(sells)
  })

  it('[E2.3][AC03] a store that does not exist may not sell', async () => {
    const { maySell } = setup('live')

    expect(await maySell({ id: 0 }, '0190f0c2-0000-7000-8000-0000000000ff')).toBe(false)
  })
})

describe('[E2.3] editing the store information', () => {
  it('[E2.3] the Owner changes the name and the default language, and the change is audited with before and after', async () => {
    const { fake, store, owner, update } = setup()

    const result = await update(owner, store.id, { name: 'Lucerne Andenken', defaultLanguage: 'de' }, 'request-3')

    expect(result).toEqual({ ok: true, store: { ...store, name: 'Lucerne Andenken', defaultLanguage: 'de' } })
    expect(fake.state.audit).toEqual([expect.objectContaining({ action: 'information-updated', before: { name: 'Zürich Andenken', defaultLanguage: 'en' }, after: { name: 'Lucerne Andenken', defaultLanguage: 'de' } })])
  })

  it('[E2.3] changes only what is sent', async () => {
    const { store, owner, update } = setup()

    expect(await update(owner, store.id, { defaultLanguage: 'de' }, null)).toEqual({ ok: true, store: { ...store, defaultLanguage: 'de' } })
  })

  it('[E2.3] a Manager is refused, and nothing changes', async () => {
    const { fake, store, manager, update } = setup()

    expect(await update(manager, store.id, { name: 'Mine now' }, null)).toEqual({ ok: false, reason: 'forbidden' })
    expect(fake.state.stores.get(store.id)?.name).toBe('Zürich Andenken')
    expect(fake.state.audit).toEqual([])
  })
})
