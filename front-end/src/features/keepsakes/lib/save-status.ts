import type { SaveState } from '../hooks/use-keepsake-editor'
import type { Translate } from './keepsake-rules'

/** Autosave's state as the bar says it: unsaved edits, saving, the time of the last save, or not saved (stale or failed). */
export function saveStatusOf(t: Translate, intlLocale: Parameters<Date['toLocaleTimeString']>[0], state: SaveState, savedAt: Date): { status: string, tone: 'muted' | 'danger' | 'success' } {
  switch (state) {
    case 'saving': return { status: t('keepsakes.save.saving'), tone: 'muted' }
    case 'unsaved': return { status: t('keepsakes.save.unsaved'), tone: 'muted' }
    case 'saved': return { status: t('keepsakes.save.saved', { time: savedAt.toLocaleTimeString(intlLocale, { hour: '2-digit', minute: '2-digit' }) }), tone: 'success' }
    case 'stale':
    case 'failed': return { status: t('keepsakes.save.notSaved'), tone: 'danger' }
  }
}
