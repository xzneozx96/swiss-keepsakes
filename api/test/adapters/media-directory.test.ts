import type { MediaInfo } from '../../src/modules/catalog/ports.ts'
import { describe, expect, it, vi } from 'vitest'
import { createMediaDirectory } from '../../src/modules/catalog/adapters/media-directory.ts'

interface Row { id: string }

const view = (row: Row) => ({ id: row.id }) as MediaInfo

function setup() {
  const findMany = vi.fn(async (_tx: null, _storeId: string, ids: string[]): Promise<Row[]> => ids.map(id => ({ id })))
  return { findMany, directory: createMediaDirectory({ findMany, view }) }
}

describe('the catalog media directory', () => {
  it('asks once for the distinct ids and returns their views', async () => {
    const { directory, findMany } = setup()

    const found = await directory.find(null, 'store-1', ['a', 'b', 'a', 'b', 'c'])

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith(null, 'store-1', ['a', 'b', 'c'])
    expect(found.map(file => file.id)).toEqual(['a', 'b', 'c'])
  })

  it('makes no query for no ids', async () => {
    const { directory, findMany } = setup()

    expect(await directory.find(null, 'store-1', [])).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })

  it('makes one query per call, however many ids', async () => {
    const { directory, findMany } = setup()

    await directory.find(null, 'store-1', Array.from({ length: 30 }, (_, n) => `id-${n}`))

    expect(findMany).toHaveBeenCalledTimes(1)
  })
})
