import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FILE_CALL_TIMEOUT_MS, uploadTimeoutMs } from '@/features/data-client/api-transport'
import { uploadPhoto } from '@/features/keepsakes/lib/upload-photo'
import { media, setUpHarness, state, storeId } from './keepsakes-harness'

beforeEach(setUpHarness)

const base = `/api/store/${storeId}/media`
const grant = { uploadKey: `${storeId}/k.jpg`, url: 'https://storage.test/uploads/k', method: 'PUT', headers: {}, expiresAt: '2026-10-30T10:15:00.000Z', kind: 'image' }
const mb = 1024 * 1024

function photoOf(size: number) {
  const file = new File(['x'], 'big.jpg', { type: 'image/jpeg' })

  Object.defineProperty(file, 'size', { value: size })

  return file
}

/** The time each call was given, in the order the calls were made: the grant, the file PUT, the confirm. */
async function givenTimes(size: number) {
  state.answer = call => call.path === `${base}/uploads` ? Response.json(grant) : call.path === `${base}/confirm` ? Response.json(media) : new Response(null, { status: 200 })
  const spy = vi.spyOn(AbortSignal, 'timeout')

  await uploadPhoto(storeId, photoOf(size))
  const times = spy.mock.calls.map(([ms]) => ms)

  spy.mockRestore()

  return times
}

describe('[E4.11][AC51] sending a keepsake photo', () => {
  it('[E4.11][AC51] the file PUT is not cut at 15 s: it gets time by size, and the grant keeps the JSON limit', async () => {
    const [grantTime, putTime, confirmTime] = await givenTimes(10 * mb)

    expect(grantTime).toBe(15_000)
    expect(putTime).toBe(uploadTimeoutMs(10 * mb))
    expect(putTime).toBeGreaterThan(15_000)
    expect(confirmTime).toBe(FILE_CALL_TIMEOUT_MS)
  })

  it('[E4.11][AC51] a bigger photo gets more time to reach storage', async () => {
    const small = await givenTimes(1 * mb)
    const large = await givenTimes(10 * mb)

    expect(large[1]).toBeGreaterThan(small[1]!)
  })
})
