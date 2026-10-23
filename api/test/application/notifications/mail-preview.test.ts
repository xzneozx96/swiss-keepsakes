import { readFileSync } from 'node:fs'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { writeMailPreviews } from '../../support/mail-preview.ts'

// `MAIL_PREVIEW_DIR=/tmp/opencode/mail-preview pnpm --filter @sk/api exec vitest run test/application/notifications/mail-preview.test.ts`
// leaves the files in that folder. Without it the test is skipped and writes nothing.
describe('[E2.8] mail preview', () => {
  it.skipIf(!process.env.MAIL_PREVIEW_DIR)('[E2.8] writes one HTML file for each template and language, ready to open in a browser', () => {
    const dir = process.env.MAIL_PREVIEW_DIR!

    const files = writeMailPreviews(dir)

    expect(files).toHaveLength(10)
    for (const file of files)
      expect(readFileSync(file, 'utf8')).toMatch(/^<!doctype html>/)
  })
})
