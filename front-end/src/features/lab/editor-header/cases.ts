import type { LanguageStatus } from '@/components/language-version-switch'
import type { EditorHeaderProps } from '@/components/layout/editor-header'

import { HiddenIcon, TrashIcon } from '@/components/icons'

export type Lang = 'en' | 'de'

/** One editor as the shipped product fills the shared header (owner, 04.11.2026: option A, the shipped save models). */
export interface EditorCase {
  id: string
  caption: string
  header: Omit<EditorHeaderProps, 'onBack' | 'onAction' | 'languageSwitch'>
  /** The editor has the EN | DE switch in its header. */
  languages?: Record<Lang, LanguageStatus>
}

function noop() {}

export const CASES: EditorCase[] = [
  {
    id: 'keepsake',
    caption: 'Keepsake editor · Details autosave, published, both languages complete, step 1 of 3',
    languages: { en: { text: 'Complete', tone: 'success' }, de: { text: 'Complete', tone: 'success' } },
    header: {
      backLabel: 'Back to Keepsakes',
      title: 'Classic SD',
      status: { tone: 'success', label: 'Published' },
      save: { text: 'Saved 10:07', tone: 'success' },
      steps: { onNext: noop },
      primary: { label: 'Review and publish', shortLabel: 'Review', onPress: noop },
      actions: [{ id: 'delete', label: 'Delete keepsake', icon: TrashIcon, isDanger: true }],
    },
  },
  {
    id: 'story',
    caption: 'Story editor · autosave, draft, Deutsch incomplete',
    languages: { en: { text: 'Draft', tone: 'warning' }, de: { text: 'Not started · choose to start it', tone: 'muted' } },
    header: {
      backLabel: 'Back to Stories',
      title: 'The night the Chapel Bridge burned',
      status: { tone: 'neutral', label: 'English · Draft' },
      save: { text: 'Saved 10:07', tone: 'success' },
      primary: { label: 'Review and publish', shortLabel: 'Review', onPress: noop },
      actions: [{ id: 'delete', label: 'Delete story', icon: TrashIcon, isDanger: true }],
    },
  },
  {
    id: 'place',
    caption: 'Place editor · explicit save, published, unsaved changes, step 2 of 6',
    header: {
      backLabel: 'All places',
      title: 'Hofkirche St. Leodegar',
      status: { tone: 'success', label: 'Published' },
      save: { text: 'Unsaved changes', tone: 'muted' },
      steps: { onPrevious: noop, onNext: noop },
      primary: { label: 'Save changes', onPress: noop },
      actions: [{ id: 'delete', label: 'Delete place', icon: TrashIcon, isDanger: true }],
    },
  },
  {
    id: 'menu',
    caption: 'Two or more secondary actions · the ⋯ menu (no editor has two today)',
    header: {
      backLabel: 'All places',
      title: 'Lucerne Festival',
      status: { tone: 'neutral', label: 'Draft' },
      save: { text: 'No changes', tone: 'muted' },
      steps: { onPrevious: noop, onNext: noop },
      secondary: { label: 'Save draft', onPress: noop },
      primary: { label: 'Next', onPress: noop },
      actions: [
        { id: 'hide', label: 'Hide from the map', icon: HiddenIcon },
        { id: 'delete', label: 'Delete place', icon: TrashIcon, isDanger: true },
      ],
      moreLabel: 'More actions for Lucerne Festival',
    },
  },
]
