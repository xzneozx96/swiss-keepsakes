import type { AutosaveState } from './autosave'

import type { MessageKey } from '@/i18n/en'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/**
 * Autosave's state as the header says it. A saved state with no time is a version that was never saved
 * (it holds no document yet). Stale and failed edits are not saved either.
 */
export function saveStatusOf(t: Translate, intlLocale: Parameters<Date['toLocaleTimeString']>[0], state: AutosaveState, savedAt: Date | null): { status: string, tone: 'muted' | 'warning' | 'danger' | 'success' } {
  switch (state) {
    case 'saving': return { status: t('storyEditor.save.saving'), tone: 'muted' }
    case 'unsaved': return { status: t('storyEditor.save.unsaved'), tone: 'warning' }
    case 'stale':
    case 'failed': return { status: t('storyEditor.save.notSaved'), tone: 'danger' }
    case 'saved':
      return savedAt
        ? { status: t('storyEditor.save.saved', { time: savedAt.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) }), tone: 'success' }
        : { status: t('storyEditor.save.notSavedYet'), tone: 'muted' }
  }
}
