import type { AccessRepository, UnitOfWork } from '../../../src/modules/identity/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeLoadAccess } from '../../../src/modules/identity/application/load-access.ts'

interface FakeTx { open: boolean }

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'

function setup() {
  const uow: UnitOfWork<FakeTx> = {
    async run(work) {
      const tx = { open: true }
      try {
        return await work(tx)
      }
      finally {
        tx.open = false
      }
    },
  }
  const access: AccessRepository<FakeTx> = {
    async find(tx, authUserId) {
      if (!tx.open)
        throw new Error('used outside its transaction')
      return authUserId === 'staff' ? { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] } : { platformAdmin: authUserId === 'admin', memberships: [] }
    },
  }
  return makeLoadAccess({ uow, access })
}

describe('[E2.10] loading what a signed-in user may be', () => {
  it('[E2.10] returns the repository\'s answer for the user, inside one unit of work', async () => {
    const loadAccess = setup()

    expect(await loadAccess('staff')).toEqual({ platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] })
    expect(await loadAccess('admin')).toEqual({ platformAdmin: true, memberships: [] })
    expect(await loadAccess('nobody')).toEqual({ platformAdmin: false, memberships: [] })
  })
})
