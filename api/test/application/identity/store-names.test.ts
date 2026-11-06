import type { StoreRepository } from '../../../src/modules/identity/ports.ts'
import { describe, expect, it } from 'vitest'
import { makeStoreNames } from '../../../src/modules/identity/application/store-names.ts'

interface FakeTx { name: string }

function setup(known: Record<string, string>) {
  const asked: string[] = []
  const stores = {
    async find(_tx: FakeTx, storeId: string) {
      asked.push(storeId)
      return known[storeId] === undefined ? undefined : { id: storeId, name: known[storeId] }
    },
  } as unknown as StoreRepository<FakeTx>
  return { asked, storeNames: makeStoreNames({ stores }) }
}

describe('store names for the public keepsake cards', () => {
  it('maps each store id to its name', async () => {
    const { storeNames } = setup({ a: 'Victorinox Lucerne', b: 'Kapellbrücke Shop' })
    expect(await storeNames({ name: 'tx' }, ['a', 'b'])).toEqual(new Map([['a', 'Victorinox Lucerne'], ['b', 'Kapellbrücke Shop']]))
  })

  it('leaves a missing store out of the map', async () => {
    const { storeNames } = setup({ a: 'Victorinox Lucerne' })
    const names = await storeNames({ name: 'tx' }, ['a', 'gone'])
    expect(names.get('a')).toBe('Victorinox Lucerne')
    expect(names.has('gone')).toBe(false)
  })

  it('reads a repeated id once', async () => {
    const { asked, storeNames } = setup({ a: 'Victorinox Lucerne' })
    const names = await storeNames({ name: 'tx' }, ['a', 'a', 'a'])
    expect(asked).toEqual(['a'])
    expect(names.size).toBe(1)
  })

  it('reads nothing for no ids', async () => {
    const { asked, storeNames } = setup({})
    expect((await storeNames({ name: 'tx' }, [])).size).toBe(0)
    expect(asked).toEqual([])
  })
})
