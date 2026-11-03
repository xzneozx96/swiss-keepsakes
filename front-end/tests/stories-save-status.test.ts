import { describe, expect, it } from 'vitest'

import { saveStatusOf } from '@/features/stories/lib/save-status'
import { en } from '@/i18n/en'

// A translate that reads the English file and fills `{time}`, as the app's does.
function t(key: keyof typeof en, params?: Record<string, string | number>) {
  return Object.entries(params ?? {}).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), en[key] as string)
}

describe('[E4.3][AC45] the story save status text', () => {
  it('[E4.3][AC45] reads Unsaved changes, Saving…, Saved {time} in the locale, Not saved for stale and failed, and Not saved yet for a version never saved', () => {
    const at = new Date(2026, 10, 3, 14, 5)

    expect(saveStatusOf(t as never, 'en-GB', 'unsaved', at)).toEqual({ status: 'Unsaved changes', tone: 'warning' })
    expect(saveStatusOf(t as never, 'en-GB', 'saving', at)).toEqual({ status: 'Saving…', tone: 'muted' })
    expect(saveStatusOf(t as never, 'en-GB', 'saved', at)).toEqual({ status: 'Saved 14:05', tone: 'success' })
    expect(saveStatusOf(t as never, 'en-GB', 'stale', at)).toEqual({ status: 'Not saved', tone: 'danger' })
    expect(saveStatusOf(t as never, 'en-GB', 'failed', at)).toEqual({ status: 'Not saved', tone: 'danger' })
    expect(saveStatusOf(t as never, 'en-GB', 'saved', null)).toEqual({ status: 'Not saved yet', tone: 'muted' })
  })
})
