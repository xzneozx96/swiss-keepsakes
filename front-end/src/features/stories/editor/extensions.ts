import type { EditorOptions, Extensions, ReactNodeViewProps } from '@tiptap/react'
import type { ComponentType } from 'react'

import { Mark, mergeAttributes, Node, ReactNodeViewRenderer, wrappingInputRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

import { linkHref } from '../lib/link-input'
import { pastedHtml } from '../lib/paste'
import { AudioView, ImageView, VideoView } from './media-views'
import { stopEvent } from './stop-event'

export interface MediaLabels { image: string, video: string, audio: string }

/**
 * The quote and the list item of the contract are narrower than Tiptap's: a quote holds paragraphs only, a list item
 * paragraphs and nested lists. `extend({ content })` is not honoured by this Tiptap version (the schema reads the
 * explicit `content` field last) and the original packages are not direct dependencies, so these two nodes replace them
 * with the same commands, keys and input rule. A heading in a quote, or a quote in a list item, cannot be made.
 */
const QUOTE_RULE = /^\s*>\s$/

const StoryBlockquote = Node.create({
  name: 'blockquote',
  content: 'paragraph+',
  group: 'block',
  defining: true,
  parseHTML() {
    return [{ tag: 'blockquote' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setBlockquote: () => ({ commands }) => commands.wrapIn(this.name),
      toggleBlockquote: () => ({ commands }) => commands.toggleWrap(this.name),
      unsetBlockquote: () => ({ commands }) => commands.lift(this.name),
    }
  },
  addKeyboardShortcuts() {
    return { 'Mod-Shift-b': () => this.editor.commands.toggleBlockquote() }
  },
  addInputRules() {
    return [wrappingInputRule({ find: QUOTE_RULE, type: this.type })]
  },
})

const StoryListItem = Node.create({
  name: 'listItem',
  content: 'paragraph (paragraph|bulletList|orderedList)*',
  defining: true,
  parseHTML() {
    return [{ tag: 'li' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(HTMLAttributes), 0]
  },
  addKeyboardShortcuts() {
    return {
      'Enter': () => this.editor.commands.splitListItem(this.name),
      'Tab': () => this.editor.commands.sinkListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    }
  },
})

function attribute(name: string) {
  return {
    default: '',
    parseHTML: (element: HTMLElement) => element.getAttribute(`data-${name}`) ?? '',
  }
}

/**
 * A photo, video or recording: a React view in the editor (picture, own field, caption, move and remove), and `figure` markup for
 * the clipboard and a stored body, so nothing is stripped on load. `attributes` maps each of the contract's attributes to its
 * `data-` name.
 */
function mediaNode(name: 'image' | 'video' | 'audio', attributes: Record<string, string>, label: string, View: ComponentType<ReactNodeViewProps>) {
  return Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,
    addNodeView() {
      return ReactNodeViewRenderer(View, { stopEvent })
    },
    addAttributes() {
      return Object.fromEntries(Object.entries(attributes).map(([id, data]) => [id, attribute(data)]))
    },
    parseHTML() {
      return [{ tag: `figure[data-node="${name}"]` }]
    },
    renderHTML({ node }) {
      const data = Object.fromEntries(Object.entries(attributes).map(([id, dataName]) => [`data-${dataName}`, String(node.attrs[id] ?? '')]))

      return ['figure', { 'data-node': name, 'aria-label': label, 'data-label': label, ...data }, ['span', {}, label]]
    },
  })
}

/** Text that links to one of the store's pins; it stores the pin id only (ADR-011). Its tool comes with the pin ticket. */
const PinLink = Mark.create({
  name: 'pinLink',
  inclusive: false,
  excludes: 'link',
  addAttributes() {
    return { pinId: { default: null, parseHTML: (element: HTMLElement) => element.getAttribute('data-pin-id') } }
  },
  parseHTML() {
    return [{ tag: 'a[data-pin-id]', priority: 1000 }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', { 'data-pin-id': HTMLAttributes.pinId, 'class': 'pin-link' }, 0]
  },
})

/** The extensions of the story body: the contract's allow-list, nothing more (ADR-003, ADR-014). */
export function createStoryExtensions(labels: MediaLabels): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      blockquote: false,
      listItem: false,
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      horizontalRule: false,
      // A trailing paragraph would change a body that ends in a list, a quote or media the moment it opens.
      trailingNode: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', isAllowedUri: url => linkHref(url) !== undefined },
    }),
    StoryBlockquote,
    StoryListItem,
    mediaNode('image', { mediaId: 'media-id', alt: 'alt', caption: 'caption' }, labels.image, ImageView),
    mediaNode('video', { youtubeId: 'youtube-id', title: 'title', caption: 'caption' }, labels.video, VideoView),
    mediaNode('audio', { mediaId: 'media-id', title: 'title', caption: 'caption' }, labels.audio, AudioView),
    PinLink,
  ]
}

export const storyEditorProps: EditorOptions['editorProps'] = { transformPastedHTML: pastedHtml }
