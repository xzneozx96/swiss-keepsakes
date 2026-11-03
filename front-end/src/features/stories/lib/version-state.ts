import type { StoryVersion } from '@sk/api-contract'

export type VersionState = 'published' | 'editsNotLive' | 'draft' | 'none'

/** A published version with a draft on top, or with edits typed but not saved, is "edits not live" (ADR-014). */
export function versionStateOf(version: StoryVersion | null, hasLocalEdits: boolean): VersionState {
  if (!version)
    return 'none'
  if (version.status === 'published')
    return version.draft !== null || hasLocalEdits ? 'editsNotLive' : 'published'

  return 'draft'
}
