import type { StoryDraft, StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { StoryLanguage } from './search-params'

import { emptyStoryBody } from '@sk/domain/content'

export const TITLE_MAX = 140
export const EXCERPT_MAX = 300
export const AUTHOR_MAX = 120

/** What the editor holds while it is typed: the fields of one version's document. */
export interface StoryFields {
  title: string
  excerpt: string
  coverMediaId: string | null
  body: StoryDraft['body']
  checkedOn?: string | null
}

// The read type of a body is looser than the write type (a node's type is any string); the API wrote it, so it is the document.
const emptyBody = emptyStoryBody as StoryDraft['body']

/** The document the editor opens on: the draft, else the published copy, else nothing yet. */
export function fieldsOf(version: StoryVersion): StoryFields {
  const document = version.draft ?? version.published

  if (!document)
    return { title: '', excerpt: '', coverMediaId: null, body: emptyBody }

  return {
    title: document.title,
    excerpt: document.excerpt,
    coverMediaId: document.coverMediaId,
    body: document.body as StoryDraft['body'],
    ...(document.checkedOn !== undefined && { checkedOn: document.checkedOn }),
  }
}

/**
 * The whole document a save sends (ADR-014: a save replaces the draft). The author is the signed-in account's name; with
 * no known name the stored one stays, so a save never blanks it.
 */
export function draftOf(fields: StoryFields, authorName: string, stored: string): StoryDraft {
  const author = authorName.trim().slice(0, AUTHOR_MAX)

  return {
    title: fields.title.slice(0, TITLE_MAX),
    excerpt: fields.excerpt.slice(0, EXCERPT_MAX),
    authorName: author === '' ? stored : author,
    coverMediaId: fields.coverMediaId,
    body: fields.body,
    ...(fields.checkedOn !== undefined && { checkedOn: fields.checkedOn }),
  }
}

/** The empty draft of a language that is started: the other language's cover is a good first guess. */
export function startDraft(authorName: string, coverMediaId: string | null): StoryDraft {
  return { title: '', excerpt: '', authorName: authorName.trim().slice(0, AUTHOR_MAX), coverMediaId, body: emptyBody }
}

/** The cover of the other language's version, draft before published. */
export function otherCover(versions: StoryGroupDetail['versions'], language: StoryLanguage): string | null {
  const other = versions[language === 'en' ? 'de' : 'en']
  const document = other?.draft ?? other?.published

  return document?.coverMediaId ?? null
}
