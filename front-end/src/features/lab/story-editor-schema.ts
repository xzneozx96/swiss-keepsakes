import { safeHref } from '@sk/domain/shared'
import { Mark, mergeAttributes, Node } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

/**
 * The story editor's Tiptap schema (decision 2026-10-28): exactly the allow-list, nothing more.
 * Imported only by the lazily loaded editor (`story-editor-tiptap.tsx`) and the tests, so no
 * route or shared module pulls ProseMirror into a first load (performance rule 9).
 *
 * Media sit in their own group, which only the document accepts: a photo, video or recording
 * can never land inside a quote or a list item, so they stay top-level blocks between paragraphs.
 */

const StoryDoc = Node.create({
  name: 'doc',
  topNode: true,
  content: '(block|media)+',
})

const caption = { default: '' }

export const ImageNode = Node.create({
  name: 'image',
  group: 'media',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { mediaId: { default: null }, alt: { default: '' }, caption }
  },
  parseHTML() {
    return [{ tag: 'figure[data-node="image"]', getAttrs: el => ({ mediaId: (el as HTMLElement).dataset.mediaId ?? null, alt: (el as HTMLElement).dataset.alt ?? '', caption: (el as HTMLElement).dataset.caption ?? '' }) }]
  },
  renderHTML({ node }) {
    return ['figure', { 'data-node': 'image', 'data-media-id': node.attrs.mediaId, 'data-alt': node.attrs.alt, 'data-caption': node.attrs.caption }]
  },
})

export const VideoNode = Node.create({
  name: 'video',
  group: 'media',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { youtubeId: { default: null }, title: { default: '' }, caption }
  },
  parseHTML() {
    return [{ tag: 'figure[data-node="video"]', getAttrs: el => ({ youtubeId: (el as HTMLElement).dataset.youtubeId ?? null, title: (el as HTMLElement).dataset.title ?? '', caption: (el as HTMLElement).dataset.caption ?? '' }) }]
  },
  renderHTML({ node }) {
    return ['figure', { 'data-node': 'video', 'data-youtube-id': node.attrs.youtubeId, 'data-title': node.attrs.title, 'data-caption': node.attrs.caption }]
  },
})

export const AudioNode = Node.create({
  name: 'audio',
  group: 'media',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { mediaId: { default: null }, title: { default: '' }, caption }
  },
  parseHTML() {
    return [{ tag: 'figure[data-node="audio"]', getAttrs: el => ({ mediaId: (el as HTMLElement).dataset.mediaId ?? null, title: (el as HTMLElement).dataset.title ?? '', caption: (el as HTMLElement).dataset.caption ?? '' }) }]
  },
  renderHTML({ node }) {
    return ['figure', { 'data-node': 'audio', 'data-media-id': node.attrs.mediaId, 'data-title': node.attrs.title, 'data-caption': node.attrs.caption }]
  },
})

/** Text that links to one of the store's pins; stores the pin id only (ADR-011). */
export const PinLinkMark = Mark.create({
  name: 'pinLink',
  inclusive: false,
  excludes: 'link',
  addAttributes() {
    return { pinId: { default: null } }
  },
  parseHTML() {
    return [{ tag: 'a[data-pin-id]', getAttrs: el => ({ pinId: (el as HTMLElement).dataset.pinId ?? null }) }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes({ 'data-pin-id': HTMLAttributes.pinId, 'class': 'pin-link' }), 0]
  },
})

/** StarterKit with every extension outside the allow-list turned off. */
export const storyKit = StarterKit.configure({
  document: false,
  heading: { levels: [2, 3] },
  code: false,
  codeBlock: false,
  strike: false,
  underline: false,
  horizontalRule: false,
  link: {
    openOnClick: false,
    autolink: true,
    defaultProtocol: 'https',
    isAllowedUri: url => Boolean(safeHref(url)),
  },
})

/** The extensions without React node views (the test and any headless use). */
export const storyExtensions = [StoryDoc, storyKit, ImageNode, VideoNode, AudioNode, PinLinkMark]
export { StoryDoc }
