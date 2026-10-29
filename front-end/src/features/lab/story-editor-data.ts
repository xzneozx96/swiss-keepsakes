import type { ArticleSection } from '@sk/domain/content'

import { products } from '@/features/catalog/seed'
import { articleSeed } from '@/features/content/seed'
import { seedRows } from './media-data'
import { INTERESTS, LAB_TODAY, seedPins } from './pins-merchant-data'

/**
 * Mock data for the story editor lab (M17, E4.3). The body follows the decision of 28.10.2026
 * (`docs/decisions/2026-10-28-story-editor.md`): one Tiptap JSON document per language version.
 * Stories come from the prototype seed (`features/content/seed.ts`) through a lab-only
 * `sectionsToBody`; pins from the pin lab; media from the media library lab (N18). Nothing is saved.
 */

export { INTERESTS, LAB_TODAY }
export type Language = 'en' | 'de'
export const LANGUAGES: Language[] = ['en', 'de']
/** The signed-in merchant account in the lab; its display name is the author of what it writes. */
export const LAB_USER = { name: 'Sonja' }
export const LANG_NAME: Record<Language, string> = { en: 'English', de: 'Deutsch' }

// ---------------------------------------------------------------------------------------------
// The body document

export interface BodyMark {
  type: string
  attrs?: Record<string, unknown>
}

/** A ProseMirror JSON node. The allow-list lives in `story-editor-rules.ts`. */
export interface BodyNode {
  type: string
  attrs?: Record<string, unknown>
  content?: BodyNode[]
  marks?: BodyMark[]
  text?: string
}

export interface StoryBody {
  type: 'doc'
  content: BodyNode[]
}

export const text = (value: string, marks?: BodyMark[]): BodyNode => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value })
export const para = (...content: BodyNode[]): BodyNode => ({ type: 'paragraph', content })
export const h2 = (value: string): BodyNode => ({ type: 'heading', attrs: { level: 2 }, content: [text(value)] })
export const h3 = (value: string): BodyNode => ({ type: 'heading', attrs: { level: 3 }, content: [text(value)] })
export const bold = { type: 'bold' }
export const italic = { type: 'italic' }
export const link = (href: string): BodyMark => ({ type: 'link', attrs: { href } })
export const pinLink = (pinId: string): BodyMark => ({ type: 'pinLink', attrs: { pinId } })
export const image = (mediaId: string, caption: string, alt = ''): BodyNode => ({ type: 'image', attrs: { mediaId, alt, caption } })
export const video = (youtubeId: string, title: string, caption: string): BodyNode => ({ type: 'video', attrs: { youtubeId, title, caption } })
export const audio = (mediaId: string, title: string, caption: string): BodyNode => ({ type: 'audio', attrs: { mediaId, title, caption } })
export const emptyBody = (): StoryBody => ({ type: 'doc', content: [{ type: 'paragraph' }] })

const BLANK_LINE = /\n\s*\n/

/** A paragraph's text: a blank line starts a new paragraph, one newline becomes a hard break. */
function paragraphs(value: string): BodyNode[] {
  return value.split(BLANK_LINE).filter(Boolean).map(chunk => ({
    type: 'paragraph',
    content: chunk.split('\n').flatMap((line, i) => (i ? [{ type: 'hardBreak' }, text(line)] : [text(line)])),
  }))
}

/**
 * Lab-only stand-in for the domain's `sectionsToBody` (decision, "Migration of existing data"):
 * the intro becomes the first paragraphs, a section heading an H2, each block the node of the
 * same name. The prototype names photos and recordings by slug; the library row id is
 * `img-<slug>` / `aud-<name>` (N18 lab), which stands in for the media uuid.
 */
export function sectionsToBody(intro: string, sections: ArticleSection[]): StoryBody {
  const content: BodyNode[] = [...paragraphs(intro)]

  for (const section of sections) {
    if (section.heading)
      content.push(h2(section.heading))
    for (const block of section.blocks) {
      if (block.type === 'paragraph')
        content.push(...paragraphs(block.text))
      else if (block.type === 'image')
        content.push(image(`img-${block.photo}`, block.caption))
      else if (block.type === 'video')
        content.push(video(block.youtubeId, block.title, block.caption))
      else content.push(audio(`aud-${block.audio}`, block.title, block.caption))
    }
  }

  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

// ---------------------------------------------------------------------------------------------
// Media (from the N18 library lab: only ready photos and recordings can go into a story)

export interface LabMedia {
  id: string
  kind: 'image' | 'audio'
  name: string
  /** Photo slug for `Media`, or the recording's file name for `audioUrl`. */
  preview: string
  alt: string
  createdAt: string
  /** Ready to use; a processing photo shows in the picker but cannot be chosen yet. */
  ready: boolean
}

export const media: LabMedia[] = seedRows
  .filter(r => r.status !== 'retired' && (r.kind === 'image' || r.kind === 'audio'))
  .map(r => ({
    id: r.id,
    kind: r.kind as 'image' | 'audio',
    name: r.name,
    preview: r.preview,
    alt: r.alt.en ?? r.alt.de ?? '',
    createdAt: r.createdAt,
    ready: r.status === 'ready',
  }))

const mediaById = new Map(media.map(m => [m.id, m]))
/** Files uploaded in this frame: id → object URL. Lab only; the real upload goes to the library (N18). */
export const uploadUrls = new Map<string, string>()

export function mediaOf(id: string | null | undefined) {
  return id ? mediaById.get(id) : undefined
}

let uploadSeed = 0

/** Adds an uploaded file to this frame's library, newest first, and returns it. */
export function addUpload(file: File, kind: LabMedia['kind']): LabMedia {
  uploadSeed += 1
  const row: LabMedia = {
    id: `upload-${uploadSeed}`,
    kind,
    name: file.name,
    preview: '',
    alt: '',
    createdAt: LAB_TODAY,
    ready: true,
  }

  media.unshift(row)
  mediaById.set(row.id, row)
  uploadUrls.set(row.id, URL.createObjectURL(file))

  return row
}

// ---------------------------------------------------------------------------------------------
// Pins, keepsakes, blog categories, other stories

export interface LabPin {
  id: string
  name: string
  status: 'draft' | 'published' | 'hidden'
  photo: string
  link: string
  address: string
  slug: string
}

export const pins: LabPin[] = seedPins.map(p => ({
  id: p.id,
  slug: p.slug,
  name: p.title.en || p.title.de || 'Untitled pin',
  status: p.status,
  photo: p.photo,
  link: p.link,
  address: p.address,
}))

export const pinById = new Map(pins.map(p => [p.id, p]))

export interface LabKeepsake {
  id: string
  name: string
  photo: string
  published: boolean
}

/** One keepsake is marked unpublished here only, to show the picker refusing it (AC31). */
const LAB_UNPUBLISHED = new Set(['p-vx-gotthard'])

export const keepsakes: LabKeepsake[] = products.map(p => ({
  id: p.id,
  name: p.name.en ?? p.name.de ?? p.id,
  photo: p.photo ?? '',
  published: p.published !== false && !LAB_UNPUBLISHED.has(p.id),
}))

/**
 * Blog categories, a small mock: the category editor (N23) is built elsewhere. Names in EN and
 * DE; one sub-category; Reviews has no German name yet (AC87 allows one language).
 */
export interface BlogCategory {
  id: string
  name: { en: string, de: string }
  parentId: string | null
}

export const blogCategories: BlogCategory[] = [
  { id: 'legends', name: { en: 'Legends', de: 'Sagen' }, parentId: null },
  { id: 'history', name: { en: 'Swiss history', de: 'Schweizer Geschichte' }, parentId: null },
  { id: 'old-town', name: { en: 'Old Town', de: 'Altstadt' }, parentId: 'history' },
  { id: 'tips', name: { en: 'Practical tips', de: 'Praktische Tipps' }, parentId: null },
  { id: 'reviews', name: { en: 'Reviews', de: '' }, parentId: null },
]

/** The other stories, for "More to discover": which versions are published decides who sees them. */
export interface RelatedStory {
  slug: string
  title: string
  photo: string
  versions: Record<Language, boolean>
}

export const otherStories: RelatedStory[] = [...new Set(articleSeed.map(a => a.slug))]
  .filter(slug => slug !== 'musegg-morning')
  .map((slug) => {
    const of = (l: Language) => articleSeed.find(a => a.slug === slug && a.language === l)
    const en = of('en')
    const de = of('de')

    return {
      slug,
      title: en?.title ?? de?.title ?? slug,
      photo: (en ?? de)!.photo,
      versions: { en: en?.publication.status === 'published', de: de?.publication.status === 'published' },
    }
  })

// ---------------------------------------------------------------------------------------------
// The story being edited

export type StayTag = 'short_stay' | 'multi_day' | 'both'
export type Interest = (typeof INTERESTS)[number]
export type VersionStatus = 'published' | 'draft' | 'missing'
export type StoryKind = 'story' | 'review'

export interface StoryVersion {
  status: VersionStatus
  /** ISO day the version went live, for the version switch. */
  publishedOn: string | null
  title: string
  excerpt: string
  /** Media id of the cover photo. */
  coverId: string | null
  body: StoryBody
}

/** One story with its two language versions. Everything outside `versions` is shared by both. */
export interface Story {
  id: string
  /** Shared by both versions: `/en/stories/<slug>` and `/de/stories/<slug>`. */
  slug: string
  /** The display name of the account that writes it; no role (owner, 29.10.2026). */
  author: string
  kind: StoryKind
  /** Only for an editorial review (PRD §11.3): the reviewed pin, who checked, and when. */
  review: { pinId: string | null, writer: string, checkedOn: string }
  categories: string[]
  pins: string[]
  stay: StayTag
  interests: Interest[]
  keepsakes: string[]
  related: string[]
  versions: Record<Language, StoryVersion>
}

function blankVersion(): StoryVersion {
  return {
    status: 'missing',
    publishedOn: null,
    title: '',
    excerpt: '',
    coverId: null,
    body: emptyBody(),
  }
}

export function newStory(): Story {
  return {
    id: 'new',
    slug: '',
    author: LAB_USER.name,
    kind: 'story',
    review: { pinId: null, writer: '', checkedOn: '' },
    categories: [],
    pins: [],
    stay: 'both',
    interests: [],
    keepsakes: [],
    related: [],
    versions: { en: { ...blankVersion(), status: 'draft' }, de: blankVersion() },
  }
}

const musegg = (l: Language) => articleSeed.find(a => a.slug === 'musegg-morning' && a.language === l)!

/**
 * The English rewrite of "A morning on the Musegg wall" as a draft, with every node and mark of
 * the allow-list: H2 and H3, a quote, both lists, bold and italic, a photo with a caption, the
 * video and the recording, a pin link (Musegg Wall, p9), a plain link, and a raw link to the
 * Hotel am See website, which is pin p10's outbound link, so the editor warns about it.
 */
const museggEnBody: StoryBody = {
  type: 'doc',
  content: [
    para(text('The Musegg wall runs along the hill above the old town. It was built in the late 14th century to guard Luzerne from the north, and long stretches of it still stand.')),
    h2('Up on the wall at dawn'),
    para(
      text('Go early, before the city wakes up. In the first hour you may have the '),
      text('Musegg Wall', [pinLink('p9')]),
      text(' almost to yourself, and the walkway is '),
      text('free', [bold]),
      text(' from April to November.'),
    ),
    image('img-lucerne-kapellbruecke-1200', 'The Water Tower and the Chapel Bridge on the Reuss, with Pilatus behind.', 'The Chapel Bridge and the Water Tower at dawn'),
    { type: 'blockquote', content: [para(text('From up here the whole town looks like a model someone forgot to put away.', [italic]))] },
    h2('The nine towers'),
    para(text('Nine towers are spaced along the wall, each with its own name. Four of them are open to visitors:')),
    {
      type: 'bulletList',
      content: ['Schirmer', 'Zyt', 'Wacht', 'Männli'].map(name => ({ type: 'listItem', content: [para(text(name))] })),
    },
    video('0UHyzRnAxy8', 'Luzerne city wall with 9 Musegg towers', 'Video: Private Luxury Travel Switzerland by Brigitte, on YouTube.'),
    h3('The clock that strikes first'),
    para(text('Listen for the Zyt tower. By tradition its clock may strike one minute before every other clock in Luzerne.')),
    audio('aud-tower-clock', 'A tower clock strikes five', ''),
    h2('Back down into the old town'),
    {
      type: 'orderedList',
      content: [
        para(text('Take the steps down by the Nölli tower.')),
        para(text('Follow the lanes to Hirschenplatz.')),
        para(text('Have breakfast with a lake view: we like the terrace of '), text('Hotel am See', [link('https://www.hotel-am-see.example.ch/')]), text('.')),
      ].map(p => ({ type: 'listItem', content: [p] })),
    },
    para(text('Opening times for the towers are on the '), text('city’s Musegg page', [link('https://www.museggmauer.ch')]), text('.')),
  ],
}

export function museggStory(): Story {
  const de = musegg('de')

  return {
    id: 'musegg-morning',
    slug: 'musegg-morning',
    author: LAB_USER.name,
    kind: 'story',
    review: { pinId: null, writer: '', checkedOn: '' },
    categories: ['old-town'],
    pins: ['p9', 'p1'],
    stay: 'short_stay',
    interests: ['history-culture', 'lake-mountains'],
    keepsakes: ['p-postcards', 'p-vx-old-town', 'p-vx-lion'],
    related: ['water-tower', 'lion-monument'],
    versions: {
      en: {
        status: 'draft',
        publishedOn: null,
        title: musegg('en').title,
        excerpt: musegg('en').excerpt,
        coverId: 'img-musegg-wall',
        body: museggEnBody,
      },
      de: {
        status: 'published',
        publishedOn: '2026-10-17',
        title: de.title,
        excerpt: de.excerpt,
        coverId: `img-${de.photo}`,
        body: sectionsToBody(de.intro, de.sections),
      },
    },
  }
}

/** An editorial review (PRD §11.3): a story of the review type, tied to one pin, with writer and check date. */
export function reviewStory(): Story {
  return {
    id: 'review-hotel-am-see',
    slug: 'hotel-am-see-review',
    author: LAB_USER.name,
    kind: 'review',
    review: { pinId: 'p10', writer: 'Sonja', checkedOn: '2026-10-12' },
    categories: ['reviews'],
    pins: ['p10'],
    stay: 'multi_day',
    interests: ['lake-mountains'],
    keepsakes: [],
    related: ['lake-steamboat'],
    versions: {
      en: {
        status: 'draft',
        publishedOn: null,
        title: 'Hotel am See: a quiet room above the quay',
        excerpt: 'We stayed two nights. What the rooms are like, where breakfast is best, and who it suits.',
        coverId: 'img-stay',
        body: {
          type: 'doc',
          content: [
            para(text('Hotel am See', [pinLink('p10')]), text(' sits on the quay, five minutes from the station. We stayed two nights in October.')),
            h2('The rooms'),
            para(text('Ask for the lake side. The rooms are small but '), text('quiet', [bold]), text(', and the windows open.')),
            h2('Who it suits'),
            para(text('Guests staying more than one night who want the lake on the doorstep.')),
          ],
        },
      },
      de: blankVersion(),
    },
  }
}
