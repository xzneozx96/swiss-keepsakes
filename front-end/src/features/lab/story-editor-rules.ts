import type { BlogCategory, BodyNode, LabPin, Language, Story, StoryBody } from './story-editor-data'

import { MAX_ARTICLE_LINKS, MAX_RELATED_STORIES } from '@sk/domain/content'

import { keepsakes, mediaOf, otherStories, pinById } from './story-editor-data'

/**
 * Pure rules of the story editor lab (M17). No Tiptap here: Details, Review and the lab page use
 * these without loading the editor (performance rule 9). The editor's schema is in
 * `story-editor-schema.ts`, and the test checks that both agree.
 */

/** The decision's allow-list (2026-10-28): nothing else may appear in a body. */
export const ALLOWED_NODES = [
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'image',
  'video',
  'audio',
] as const
export const ALLOWED_MARKS = ['bold', 'italic', 'link', 'pinLink'] as const
export const HEADING_LEVELS = [2, 3] as const
export const MEDIA_NODES = ['image', 'video', 'audio'] as const

export const MAX_KEEPSAKES = MAX_ARTICLE_LINKS
export const MAX_RELATED = MAX_RELATED_STORIES
export const WORDS_PER_MINUTE = 200

const WORD = /\S+/g
const NOT_WORD = /[^\p{L}\p{N}]+/gu
const EDGE_DASHES = /^-+|-+$/g
const WWW = /^www\./

function walk(nodes: BodyNode[] | undefined, visit: (node: BodyNode) => void) {
  for (const node of nodes ?? []) {
    visit(node)
    walk(node.content, visit)
  }
}

/** All the text of a node and its children, as one string. */
export function plainText(node: BodyNode): string {
  if (node.type === 'text')
    return node.text ?? ''
  if (node.type === 'hardBreak')
    return ' '

  return (node.content ?? []).map(plainText).join('')
}

/** "The nine towers" → "the-nine-towers"; an anchor id from heading text. */
export function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(NOT_WORD, '-').replace(EDGE_DASHES, '')
}

export interface ContentsEntry {
  anchor: string
  text: string
  level: 2 | 3
}

/**
 * Anchors for every H2 and H3 in order, unique with a counter. The contents list is the H2s only,
 * and only when there are at least two (decision, "Contents list and reading time").
 */
export function headingAnchors(body: StoryBody): ContentsEntry[] {
  const seen = new Map<string, number>()
  const out: ContentsEntry[] = []

  walk(body.content, (node) => {
    if (node.type !== 'heading')
      return
    const value = plainText(node).trim()
    const base = slugify(value) || 'section'
    const count = seen.get(base) ?? 0

    seen.set(base, count + 1)
    out.push({ anchor: count ? `${base}-${count + 1}` : base, text: value, level: node.attrs?.level === 3 ? 3 : 2 })
  })

  return out
}

export function contentsList(body: StoryBody): ContentsEntry[] {
  const h2s = headingAnchors(body).filter(h => h.level === 2)

  return h2s.length >= 2 ? h2s : []
}

export function wordCount(body: StoryBody) {
  let words = 0

  walk(body.content, (node) => {
    if (node.type === 'text')
      words += (node.text ?? '').match(WORD)?.length ?? 0
  })

  return words
}

/** Words of the text nodes / 200, rounded up, at least 1 minute. Media add nothing. */
export function readingMinutes(body: StoryBody) {
  return Math.max(1, Math.ceil(wordCount(body) / WORDS_PER_MINUTE))
}

export function isBodyEmpty(body: StoryBody) {
  return wordCount(body) === 0 && !body.content.some(n => (MEDIA_NODES as readonly string[]).includes(n.type))
}

/** Every node and mark of the body is on the allow-list (the server's check, for the test). */
export function isAllowed(body: StoryBody): boolean {
  let ok = body.type === 'doc'

  walk(body.content, (node) => {
    if (!(ALLOWED_NODES as readonly string[]).includes(node.type))
      ok = false
    if (node.type === 'heading' && !(HEADING_LEVELS as readonly unknown[]).includes(node.attrs?.level))
      ok = false
    for (const mark of node.marks ?? []) {
      if (!(ALLOWED_MARKS as readonly string[]).includes(mark.type))
        ok = false
    }
  })

  return ok
}

// ---------------------------------------------------------------------------------------------
// Links

export function hostOf(href: string) {
  try {
    return new URL(href).hostname.toLowerCase().replace(WWW, '')
  }
  catch {
    return ''
  }
}

export interface PinHostWarning {
  href: string
  /** The linked text, so the warning can name it. */
  text: string
  pin: LabPin
}

/**
 * A raw link whose host is a pin's outbound link host: the editor offers to switch it to a pin
 * link (ADR-011). A warning only; saving and publishing go on.
 */
export function pinHostWarnings(body: StoryBody, allPins: LabPin[]): PinHostWarning[] {
  const byHost = new Map<string, LabPin>()

  for (const p of allPins) {
    const host = p.link ? hostOf(p.link) : ''

    if (host && !byHost.has(host))
      byHost.set(host, p)
  }
  const out: PinHostWarning[] = []

  walk(body.content, (node) => {
    const mark = node.marks?.find(m => m.type === 'link')
    const href = typeof mark?.attrs?.href === 'string' ? mark.attrs.href : ''
    const p = href ? byHost.get(hostOf(href)) : undefined

    if (p && !out.some(w => w.href === href))
      out.push({ href, text: node.text ?? '', pin: p })
  })

  return out
}

export function pinLinksIn(body: StoryBody) {
  const ids: string[] = []

  walk(body.content, (node) => {
    for (const mark of node.marks ?? []) {
      if (mark.type === 'pinLink' && typeof mark.attrs?.pinId === 'string' && !ids.includes(mark.attrs.pinId))
        ids.push(mark.attrs.pinId)
    }
  })

  return ids
}

// ---------------------------------------------------------------------------------------------
// Limits

/** Adds or removes an id; adding past the limit changes nothing. */
export function toggleLimited(list: string[], id: string, max: number) {
  if (list.includes(id))
    return list.filter(x => x !== id)

  return list.length >= max ? list : [...list, id]
}

// ---------------------------------------------------------------------------------------------
// Blog categories (ADR-030: a parent covers items tagged only with its sub-categories)

export function parentOf(id: string, all: BlogCategory[]) {
  return all.find(c => c.id === id)?.parentId ?? null
}

/** Parents the story is in only through a chosen sub-category: shown as included, never stored. */
export function includedParents(selected: string[], all: BlogCategory[]) {
  return [...new Set(selected.map(id => parentOf(id, all)).filter((p): p is string => p !== null))]
}

/**
 * Picks or drops one category. A sub-category replaces its parent (the parent is now implied).
 * A parent replaces its chosen sub-categories (the story moves to the general category, owner
 * 29.10.2026). A parent never selects its children.
 */
export function toggleCategory(selected: string[], id: string, all: BlogCategory[]) {
  if (selected.includes(id))
    return selected.filter(x => x !== id)
  const parent = parentOf(id, all)

  if (parent)
    return [...selected.filter(x => x !== parent), id]

  return [...selected.filter(x => parentOf(x, all) !== id), id]
}

// ---------------------------------------------------------------------------------------------
// Publish checks

export type CheckStep = 'write' | 'details'
/** Where a check is fixed: a Write field or a Details card. */
export type CheckTarget = 'cover' | 'title' | 'excerpt' | 'body' | 'language' | 'link' | 'review' | 'categories' | 'pins' | 'keepsakes' | 'related'

export interface Check {
  id: string
  text: string
  step: CheckStep
  target: CheckTarget
}

export interface PublishChecks {
  /** Publishing is off until these are fixed. */
  blocking: Check[]
  /** Shown, never stop publishing. */
  warnings: Check[]
}

/**
 * What stops publishing this language version, and what only warns (owner, 29.10.2026).
 * Blocking: the cover, the title, the excerpt and the link (AC30), and for an editorial review
 * its pin and check date (PRD §11.3). Everything else warns. The other language is never required.
 */
export function publishChecks(story: Story, language: Language, allPins: LabPin[]): PublishChecks {
  const v = story.versions[language]
  const blocking: Check[] = []
  const warnings: Check[] = []
  const other: Language = language === 'en' ? 'de' : 'en'
  const write = (id: string, text: string, target: CheckTarget): Check => ({ id, text, step: 'write', target })
  const details = (id: string, text: string, target: CheckTarget): Check => ({ id, text, step: 'details', target })

  if (!v.coverId)
    blocking.push(write('cover', 'Add a cover photo.', 'cover'))
  if (!v.title.trim())
    blocking.push(write('title', 'Add a title.', 'title'))
  if (!v.excerpt.trim())
    blocking.push(write('excerpt', 'Add an excerpt.', 'excerpt'))
  if (!story.slug.trim())
    blocking.push(details('slug', 'Set the story’s link.', 'link'))
  if (story.kind === 'review' && !story.review.pinId)
    blocking.push(details('review-pin', 'Choose the place this review is about.', 'review'))
  if (story.kind === 'review' && !story.review.checkedOn)
    blocking.push(details('review-date', 'Add the day the facts were checked.', 'review'))

  if (isBodyEmpty(v.body))
    warnings.push(write('body', 'The story has no text yet.', 'body'))

  let noAlt = 0
  let noCaption = 0

  walk(v.body.content, (node) => {
    if (node.type === 'image' && !String(node.attrs?.alt ?? '').trim() && !mediaOf(String(node.attrs?.mediaId))?.alt)
      noAlt += 1
    if ((MEDIA_NODES as readonly string[]).includes(node.type) && !String(node.attrs?.caption ?? '').trim())
      noCaption += 1
  })
  if (noAlt)
    warnings.push(write('alt', noAlt === 1 ? 'One photo has no description for screen readers.' : `${noAlt} photos have no description for screen readers.`, 'body'))
  if (noCaption)
    warnings.push(write('caption', noCaption === 1 ? 'One photo, video or recording has no caption.' : `${noCaption} photos, videos or recordings have no caption.`, 'body'))

  for (const w of pinHostWarnings(v.body, allPins))
    warnings.push(write(`host-${w.href}`, `“${w.text}” links to ${hostOf(w.href)}, the website of the pin ${w.pin.name}. A pin link keeps working when that link changes.`, 'body'))

  for (const id of pinLinksIn(v.body)) {
    const p = pinById.get(id)

    if (p && p.status !== 'published')
      warnings.push(write(`pin-${id}`, `The pin ${p.name} is not published, so its link shows as plain text.`, 'body'))
  }

  if (!story.categories.length)
    warnings.push(details('categories', 'No blog category: the story shows only under All.', 'categories'))
  for (const slug of story.related) {
    const s = otherStories.find(x => x.slug === slug)

    if (s && !s.versions[language])
      warnings.push(details(`related-${slug}`, `“${s.title}” has no published ${language === 'en' ? 'English' : 'German'} version, so readers of this version will not see it.`, 'related'))
  }
  for (const id of story.keepsakes) {
    const k = keepsakes.find(x => x.id === id)

    if (k && !k.published)
      warnings.push(details(`keepsake-${id}`, `${k.name} is not published and stays hidden on the story.`, 'keepsakes'))
  }
  if (story.versions[other].status === 'missing')
    warnings.push(details('other-language', `No ${other === 'en' ? 'English' : 'German'} version yet: those readers see this one with a language notice.`, 'language'))

  return { blocking, warnings }
}
