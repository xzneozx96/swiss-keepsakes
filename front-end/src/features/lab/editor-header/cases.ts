import type { StepStatus } from '@sk/domain/catalog'
import type { IconComponent } from '@/components/icons'
import type { LanguageStatus } from '@/components/language-version-switch'
import type { StatusTextTone } from '@/components/status-text'

import { HiddenIcon, TrashIcon } from '@/components/icons'

export type Lang = 'en' | 'de'

/** What the save part of the header says. Autosave and explicit save share these three looks. */
export interface SaveState {
  text: string
  tone: 'muted' | 'warning' | 'success'
}

export interface EditorStep {
  id: string
  label: string
  status: StepStatus
}

/** One editor as the unified header sees it: every slot, filled or left out. */
export interface EditorCase {
  id: 'keepsake' | 'story' | 'place'
  /** The lab's caption for the case. */
  caption: string
  backLabel: string
  title: string
  status: { tone: StatusTextTone, label: string }
  saveModel: 'auto' | 'explicit'
  save: SaveState
  languages: Record<Lang, LanguageStatus>
  /** The one red action; `short` is its phone label. */
  primary: { label: string, short: string, isDisabled?: boolean }
  /** Secondary actions: one shows as its own icon button, two or more sit in ⋯. `confirm` is the body of the ask-first dialog. */
  menu: { id: string, label: string, icon: IconComponent, isDanger?: boolean, confirm?: string }[]
  /** The editor's steps (keepsake, place) or screens (story: Write, Review and publish). */
  steps: EditorStep[]
  current: string
  /** Steps have ← → (keepsake, place); the story's two screens do not. */
  hasArrows: boolean
  /** The two fields the stand-in page shows under the header. */
  fields: [string, string][]
  block: string
}

export const CASES: EditorCase[] = [
  {
    id: 'keepsake',
    caption: 'Keepsake editor · explicit save, published, both languages complete, on step 1 of 3',
    backLabel: 'Back to Keepsakes',
    title: 'Classic SD',
    status: { tone: 'success', label: 'Published' },
    saveModel: 'explicit',
    save: { text: 'No changes', tone: 'muted' },
    languages: { en: { text: 'Complete', tone: 'success' }, de: { text: 'Complete', tone: 'success' } },
    primary: { label: 'Save changes', short: 'Save', isDisabled: true },
    menu: [{ id: 'delete', label: 'Delete keepsake', icon: TrashIcon, isDanger: true, confirm: 'It can’t be undone. Its photos stay in your library.' }],
    steps: [
      { id: 'details', label: 'Details', status: 'done' },
      { id: 'options', label: 'Options and variants', status: 'done' },
      { id: 'review', label: 'Review and publish', status: 'todo' },
    ],
    current: 'details',
    hasArrows: true,
    block: 'Name and text',
    fields: [['Name', 'Classic SD'], ['Text', 'The small one that lives on a key ring: blade, scissors, nail file.']],
  },
  {
    id: 'story',
    caption: 'Story editor · autosave, draft, Deutsch incomplete, Review and publish',
    backLabel: 'Back to Stories',
    title: 'The night the Chapel Bridge burned',
    status: { tone: 'neutral', label: 'Draft' },
    saveModel: 'auto',
    save: { text: 'Saved 10:07', tone: 'success' },
    languages: { en: { text: 'Complete', tone: 'success' }, de: { text: 'Summary missing', tone: 'warning' } },
    primary: { label: 'Review and publish', short: 'Review' },
    menu: [{ id: 'delete', label: 'Delete story', icon: TrashIcon, isDanger: true, confirm: 'The draft will be deleted.' }],
    steps: [
      { id: 'write', label: 'Write', status: 'todo' },
      { id: 'review', label: 'Review', status: 'todo' },
    ],
    current: 'write',
    hasArrows: false,
    block: 'Cover and title',
    fields: [['Title', 'The night the Chapel Bridge burned'], ['Short summary', 'August 1993: a boat, a spark, and a city that rebuilt its bridge in eight months.']],
  },
  {
    id: 'place',
    caption: 'Place editor · explicit save, published, unsaved changes, on step 2 of 6',
    backLabel: 'Back to Places',
    title: 'Hofkirche St. Leodegar',
    status: { tone: 'success', label: 'Published' },
    saveModel: 'explicit',
    save: { text: 'Unsaved changes', tone: 'warning' },
    languages: { en: { text: 'Complete', tone: 'success' }, de: { text: 'Complete', tone: 'success' } },
    primary: { label: 'Save changes', short: 'Save' },
    menu: [
      { id: 'hide', label: 'Hide from the map', icon: HiddenIcon },
      { id: 'delete', label: 'Delete pin', icon: TrashIcon, isDanger: true, confirm: 'Guests no longer see it on the map. This can’t be undone.' },
    ],
    steps: [
      { id: 'place', label: 'Place', status: 'done' },
      { id: 'content', label: 'Content', status: 'done' },
      { id: 'when', label: 'When', status: 'done' },
      { id: 'tags', label: 'Tags', status: 'warning' },
      { id: 'links', label: 'Links', status: 'todo' },
      { id: 'review', label: 'Review', status: 'todo' },
    ],
    current: 'content',
    hasArrows: true,
    block: 'What guests read',
    fields: [['Name', 'Hofkirche St. Leodegar'], ['Short text', 'Twin spires over the lake front; the organ has 5,949 pipes.']],
  },
]
