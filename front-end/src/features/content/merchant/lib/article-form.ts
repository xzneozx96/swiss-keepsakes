import type {
  Article,
  ArticleAuthor,
  ArticleBlock,
  ArticleLink,
  ArticleSection,
  StoryCategory,
} from '@sk/domain/content'
import type { Language } from '@/contexts/locale-context'
import type { MessageKey } from '@/i18n/en'

import { parseYoutubeId } from './youtube'

const WHITESPACE_RUN = /\s+/

/**
 * The M17 editor's working copy. Blocks carry a key so React keeps each field's state while
 * blocks move; a video keeps what the merchant typed until it is saved as an id.
 */
export type FormBlock = { key: string } & (
  | { type: 'paragraph', text: string }
  | { type: 'image', photo: string, caption: string }
  | { type: 'video', youtube: string, title: string, caption: string }
  | { type: 'audio', audio: string, title: string, caption: string }
)

export type BlockType = FormBlock['type']

export interface FormSection {
  key: string
  /** The contents-bar anchor on C20; kept when an existing section is edited. */
  id: string
  heading: string
  blocks: FormBlock[]
}

export interface ArticleForm {
  language: Language
  title: string
  excerpt: string
  intro: string
  author: ArticleAuthor
  photo: string
  category: StoryCategory
  place: string
  sections: FormSection[]
  links: ArticleLink[]
  related: string[]
}

let counter = 0

export function newKey() {
  return `k${Date.now().toString(36)}${(counter++).toString(36)}`
}

export function newBlock(type: BlockType): FormBlock {
  const key = newKey()

  switch (type) {
    case 'paragraph':
      return { key, type, text: '' }
    case 'image':
      return { key, type, photo: '', caption: '' }
    case 'video':
      return { key, type, youtube: '', title: '', caption: '' }
    case 'audio':
      return { key, type, audio: '', title: '', caption: '' }
  }
}

export function newSection(): FormSection {
  return {
    key: newKey(),
    id: `s-${newKey()}`,
    heading: '',
    blocks: [newBlock('paragraph')],
  }
}

function toFormBlock(block: ArticleBlock): FormBlock {
  return block.type === 'video'
    ? {
        key: newKey(),
        type: 'video',
        youtube: block.youtubeId,
        title: block.title,
        caption: block.caption,
      }
    : { key: newKey(), ...block }
}

export function toForm(article: Article): ArticleForm {
  return {
    language: article.language,
    title: article.title,
    excerpt: article.excerpt,
    intro: article.intro,
    author: { ...article.author },
    photo: article.photo,
    category: article.category,
    place: article.place,
    sections: article.sections.map(s => ({
      key: newKey(),
      id: s.id,
      heading: s.heading,
      blocks: s.blocks.map(toFormBlock),
    })),
    links: article.links.map(l => ({ ...l })),
    related: [...article.related],
  }
}

export function emptyForm(
  language: Language,
  author: ArticleAuthor,
): ArticleForm {
  return {
    language,
    title: '',
    excerpt: '',
    intro: '',
    author,
    photo: '',
    category: 'town',
    place: '',
    sections: [newSection()],
    links: [],
    related: [],
  }
}

function toBlock(block: FormBlock): ArticleBlock {
  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', text: block.text.trim() }
    case 'image':
      return {
        type: 'image',
        photo: block.photo,
        caption: block.caption.trim(),
      }
    case 'video':
      return {
        type: 'video',
        youtubeId: parseYoutubeId(block.youtube) ?? block.youtube.trim(),
        title: block.title.trim(),
        caption: block.caption.trim(),
      }
    case 'audio':
      return {
        type: 'audio',
        audio: block.audio,
        title: block.title.trim(),
        caption: block.caption.trim(),
      }
  }
}

const words = (text: string) => text.split(WHITESPACE_RUN).filter(Boolean).length

/** 200 words a minute, rounded up; a video or recording adds a minute each. */
export function readMinutes(form: ArticleForm): number {
  const blocks = form.sections.flatMap(s => s.blocks)
  const count
    = words(form.intro)
      + form.sections.reduce((n, s) => n + words(s.heading), 0)
      + blocks.reduce(
        (n, b) =>
          n + (b.type === 'paragraph' ? words(b.text) : words(b.caption ?? '')),
        0,
      )
  const media = blocks.filter(
    b => b.type === 'video' || b.type === 'audio',
  ).length

  return Math.max(1, Math.ceil(count / 200) + media)
}

/** The stored fields the editor owns; id, slug, publication and dates are set on save. */
export function fromForm(
  form: ArticleForm,
): Omit<Article, 'id' | 'slug' | 'publication' | 'updatedAt'> {
  const sections: ArticleSection[] = form.sections.map(s => ({
    id: s.id,
    heading: s.heading.trim(),
    blocks: s.blocks.map(toBlock),
  }))

  return {
    language: form.language,
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    intro: form.intro.trim(),
    author: { name: form.author.name.trim(), role: form.author.role.trim() },
    photo: form.photo,
    category: form.category,
    place: form.place.trim(),
    sections,
    readMinutes: readMinutes(form),
    links: form.links,
    related: form.related,
  }
}

/** Field errors by field path ("title", "<section key>.heading", "<block key>.caption"). */
export type FormErrors = Record<string, MessageKey>

/**
 * A draft needs only a title (so the list can name it) and no malformed video link. Publishing
 * needs everything C20 shows: the cover and its texts, a heading per section (the contents
 * bar), and each block's content, photo captions (they are the alt text) and media titles
 * (they name the play buttons).
 */
export function validate(
  form: ArticleForm,
  mode: 'draft' | 'publish',
): FormErrors {
  const errors: FormErrors = {}
  const blank = (v: string) => v.trim() === ''

  if (blank(form.title))
    errors.title = 'merchantArticles.error.title'
  for (const section of form.sections) {
    for (const block of section.blocks) {
      if (
        block.type === 'video'
        && !blank(block.youtube)
        && !parseYoutubeId(block.youtube)
      ) {
        errors[`${block.key}.youtube`] = 'merchantArticles.error.youtube'
      }
    }
  }
  if (mode === 'draft')
    return errors

  if (blank(form.excerpt))
    errors.excerpt = 'merchantArticles.error.excerpt'
  if (blank(form.author.name))
    errors['author.name'] = 'merchantArticles.error.authorName'
  if (blank(form.author.role))
    errors['author.role'] = 'merchantArticles.error.authorRole'
  if (!form.photo)
    errors.photo = 'merchantArticles.error.cover'
  if (blank(form.place))
    errors.place = 'merchantArticles.error.place'
  if (blank(form.intro))
    errors.intro = 'merchantArticles.error.intro'
  if (form.sections.length === 0)
    errors.sections = 'merchantArticles.error.sections'
  for (const section of form.sections) {
    if (blank(section.heading))
      errors[`${section.key}.heading`] = 'merchantArticles.error.heading'
    if (section.blocks.length === 0)
      errors[`${section.key}.blocks`] = 'merchantArticles.error.blocks'
    for (const block of section.blocks) {
      const at = (field: string) => `${block.key}.${field}`

      switch (block.type) {
        case 'paragraph':
          if (blank(block.text))
            errors[at('text')] = 'merchantArticles.error.paragraph'
          break
        case 'image':
          if (!block.photo)
            errors[at('photo')] = 'merchantArticles.error.photo'
          if (blank(block.caption))
            errors[at('caption')] = 'merchantArticles.error.caption'
          break
        case 'video':
          if (blank(block.youtube))
            errors[at('youtube')] = 'merchantArticles.error.youtube'
          if (blank(block.title))
            errors[at('title')] = 'merchantArticles.error.videoTitle'
          break
        case 'audio':
          if (!block.audio)
            errors[at('audio')] = 'merchantArticles.error.audio'
          if (blank(block.title))
            errors[at('title')] = 'merchantArticles.error.audioTitle'
          break
      }
    }
  }

  return errors
}

/** The first of `base`, `base-2`, `base-3`… that is not taken. */
export function uniqueValue(base: string, taken: Set<string>): string {
  if (!taken.has(base))
    return base
  let n = 2

  while (taken.has(`${base}-${n}`)) n++

  return `${base}-${n}`
}

/** Moves the item at `index` one place up (-1) or down (+1). */
export function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by

  if (to < 0 || to >= list.length)
    return list
  const next = [...list];

  [next[index], next[to]] = [next[to], next[index]]

  return next
}
