import type { Logger } from 'pino'
import { describe, expect, it } from 'vitest'
import { createMediaLogAlert } from '../../../src/modules/content/adapters/media-alert.ts'

function setup() {
  const lines: { level: string, object: object }[] = []
  const logger = { error: (object: object) => lines.push({ level: 'error', object }) } as unknown as Logger
  return { lines, alert: createMediaLogAlert(logger) }
}

describe('[E2.7] media log alert', () => {
  it('[E2.7] a failure logs one error line named media.failed with ids only', () => {
    const t = setup()
    t.alert({ storeId: 's', mediaId: 'm' })
    expect(t.lines).toEqual([{ level: 'error', object: { event: 'media.failed', storeId: 's', mediaId: 'm' } }])
  })

  it('[E2.7] a failure of a file in use logs one error line named media.failed-in-use with ids only', () => {
    const t = setup()
    t.alert({ storeId: 's', mediaId: 'm', inUse: true })
    expect(t.lines).toEqual([{ level: 'error', object: { event: 'media.failed-in-use', storeId: 's', mediaId: 'm' } }])
  })
})
