import type { MessageKey } from '@/i18n/en'

/** The copy of each API problem on the story editor. A type that is not listed reads as the generic text. */
export const storyProblemKeys: Partial<Record<string, MessageKey>> = {
  'precondition-failed': 'storyEditor.problem.stale',
  'media-retired': 'storyEditor.problem.media',
  'media-invalid': 'storyEditor.problem.media',
  'version-exists': 'storyEditor.problem.versionExists',
  'not-found': 'storyEditor.problem.generic',
  'forbidden': 'storyEditor.problem.generic',
  'validation-failed': 'storyEditor.problem.generic',
  'publish-incomplete': 'storyPublish.problem.incomplete',
  'media-processing': 'storyPublish.problem.processing',
  'content-slug-taken': 'storyPublish.link.taken',
  'slug-conflict': 'storyEditor.problem.generic',
}

export function storyProblemKey(type: string): MessageKey {
  return storyProblemKeys[type] ?? 'storyEditor.problem.generic'
}
