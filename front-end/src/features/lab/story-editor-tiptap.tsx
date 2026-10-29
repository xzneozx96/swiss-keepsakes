import type { NodeViewProps } from '@tiptap/react'
import type { BodyNode, Language, StoryBody } from './story-editor-data'
import type { MediaKind } from './story-editor-sheets'

import { Button, Input, TextField } from '@heroui/react'
import { safeHref } from '@sk/domain/shared'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import { useEffect, useRef, useState } from 'react'
import { Video as VideoIcon } from 'reicon-react'

import {
  BoldIcon,
  BulletListIcon,
  CloseIcon,
  ItalicIcon,
  LinkIcon,
  MusicIcon,
  NumberedListIcon,
  PhotoAddIcon,
  PickupIcon,
  PlusIcon,
  QuoteIcon,
  RedoIcon,
  StatusWarningIcon,
  TrashIcon,
  UndoIcon,
} from '@/components/icons'
import { useIsWide } from '@/hooks/use-is-wide'
import { mediaOf, pinById, pins } from './story-editor-data'
import { hostOf, pinHostWarnings } from './story-editor-rules'
import { AudioNode, ImageNode, PinLinkMark, StoryDoc, storyKit, VideoNode } from './story-editor-schema'
import { MediaInsertSheet, PhotoById, PinPickerSheet } from './story-editor-sheets'

/**
 * The story body editor (M17, Write), one Tiptap document with exactly the decision's allow-list.
 * Loaded with `lazy(() => import(...))`, never from a route or shared module (performance rule
 * 9). From 1024 px: a formatting bar always shown at the top of the Story card, pinned under the
 * page header while the text scrolls, with Insert, and the same tools in a bubble on selected
 * text; a "+" at the start of an empty line is a shortcut for a photo, video or recording (owner,
 * 29.10.2026). On phones only the bar, docked above the keyboard (a bubble would fight the native
 * selection menu); its buttons are 44 px.
 */

// ---------------------------------------------------------------------------------------------
// Media blocks: a figure with its caption (an attribute, so no nested editor)

const figureShell = 'group/figure relative my-6 flex flex-col gap-2 rounded-2xl outline-none data-[selected=true]:ring-2 data-[selected=true]:ring-foreground data-[selected=true]:ring-offset-4'
const captionInput = 'w-full bg-transparent text-label text-muted outline-none placeholder:text-muted/70 focus:text-foreground'

function FigureTools({ label, onRemove }: { label: string, onRemove: () => void }) {
  return (
    <span className="absolute end-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover/figure:opacity-100 group-focus-within/figure:opacity-100 group-data-[selected=true]/figure:opacity-100 max-lg:opacity-100">
      <button aria-label={`Remove ${label}`} className="flex size-11 items-center justify-center rounded-full bg-surface/95 text-foreground shadow-surface outline-none focus-visible:focus-ring lg:size-9" type="button" onClick={onRemove}>
        <TrashIcon aria-hidden size={18} />
      </button>
    </span>
  )
}

function Caption({ value, label, onChange }: { value: string, label: string, onChange: (value: string) => void }) {
  return (
    <input
      aria-label={label}
      className={captionInput}
      maxLength={300}
      placeholder="Add a caption (optional)"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function ImageView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const mediaId = node.attrs.mediaId as string
  const item = mediaOf(mediaId)
  const alt = node.attrs.alt as string

  return (
    <NodeViewWrapper as="figure" className={figureShell} contentEditable={false} data-selected={selected}>
      <div data-drag-handle="">
        <PhotoById alt={alt} className="aspect-[4/3] w-full rounded-2xl" mediaId={mediaId} />
      </div>
      <FigureTools label="photo" onRemove={deleteNode} />
      <Caption label="Photo caption" value={node.attrs.caption as string} onChange={caption => updateAttributes({ caption })} />
      <label className="flex items-center gap-2 text-xs text-muted">
        <span className="shrink-0">Description</span>
        <input
          className="min-w-0 flex-1 rounded-lg bg-default/60 px-2 py-1 text-xs text-foreground outline-none focus:bg-default"
          maxLength={300}
          placeholder={item?.alt ? `From the library: ${item.alt}` : 'What a screen reader says'}
          value={alt}
          onChange={e => updateAttributes({ alt: e.target.value })}
        />
      </label>
    </NodeViewWrapper>
  )
}

function VideoView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper as="figure" className={figureShell} contentEditable={false} data-selected={selected}>
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground" data-drag-handle="">
        <img alt="" className="size-full object-cover opacity-90" src={`https://i.ytimg.com/vi/${node.attrs.youtubeId as string}/hqdefault.jpg`} />
        <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute inset-x-4 bottom-3 flex items-center gap-2 text-white">
          <VideoIcon aria-hidden size={18} />
          <input
            aria-label="Video title"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/70"
            maxLength={300}
            value={node.attrs.title as string}
            onChange={e => updateAttributes({ title: e.target.value })}
          />
          <span className="shrink-0 text-xs text-white/80">YouTube</span>
        </span>
      </div>
      <FigureTools label="video" onRemove={deleteNode} />
      <Caption label="Video caption" value={node.attrs.caption as string} onChange={caption => updateAttributes({ caption })} />
    </NodeViewWrapper>
  )
}

function AudioView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper as="figure" className={figureShell} contentEditable={false} data-selected={selected}>
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 pe-14 shadow-surface lg:pe-12" data-drag-handle="">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <MusicIcon aria-hidden size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <input
            aria-label="Recording title"
            className="w-full bg-transparent text-sm font-semibold outline-none"
            maxLength={300}
            value={node.attrs.title as string}
            onChange={e => updateAttributes({ title: e.target.value })}
          />
          <span className="truncate text-xs text-muted">{mediaOf(node.attrs.mediaId as string)?.name ?? 'Recording'}</span>
        </span>
      </div>
      <FigureTools label="recording" onRemove={deleteNode} />
      <Caption label="Recording caption" value={node.attrs.caption as string} onChange={caption => updateAttributes({ caption })} />
    </NodeViewWrapper>
  )
}

/** Keystrokes and clicks inside a figure's fields stay out of ProseMirror. */
const stopEvent = ({ event }: { event: Event }) => Boolean((event.target as HTMLElement | null)?.closest?.('input,button'))

const editorExtensions = [
  StoryDoc,
  storyKit,
  ImageNode.extend({ addNodeView: () => ReactNodeViewRenderer(ImageView, { stopEvent }) }),
  VideoNode.extend({ addNodeView: () => ReactNodeViewRenderer(VideoView, { stopEvent }) }),
  AudioNode.extend({ addNodeView: () => ReactNodeViewRenderer(AudioView, { stopEvent }) }),
  PinLinkMark,
]

// ---------------------------------------------------------------------------------------------
// Typography: the guest story page's (C20) sizes, so writing looks like reading.

const proseClass = [
  'min-h-48 max-w-none outline-none',
  '[&_p]:text-[17px] [&_p]:leading-8 [&_li]:text-[17px] [&_li]:leading-8',
  '[&>*+*]:mt-4 [&_h2]:pt-6 [&_h2]:font-serif [&_h2]:text-title [&_h3]:pt-3 [&_h3]:font-serif [&_h3]:text-heading',
  '[&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6 [&_li+li]:mt-1',
  '[&_blockquote]:border-s-2 [&_blockquote]:border-foreground [&_blockquote]:ps-4 [&_blockquote]:font-serif [&_blockquote]:text-lg [&_blockquote]:italic',
  '[&_a]:underline [&_a]:underline-offset-4',
  '[&_a.pin-link]:rounded-md [&_a.pin-link]:bg-accent-soft [&_a.pin-link]:px-1 [&_a.pin-link]:text-accent-soft-foreground [&_a.pin-link]:no-underline',
].join(' ')

// ---------------------------------------------------------------------------------------------
// Tools

type Tool = 'bold' | 'italic' | 'h2' | 'h3' | 'quote' | 'bullets' | 'numbers'

const TOOLS: { id: Tool, label: string, icon?: typeof BoldIcon, text?: string }[] = [
  { id: 'h2', label: 'Heading', text: 'H2' },
  { id: 'h3', label: 'Small heading', text: 'H3' },
  { id: 'bold', label: 'Bold', icon: BoldIcon },
  { id: 'italic', label: 'Italic', icon: ItalicIcon },
  { id: 'quote', label: 'Quote', icon: QuoteIcon },
  { id: 'bullets', label: 'Bulleted list', icon: BulletListIcon },
  { id: 'numbers', label: 'Numbered list', icon: NumberedListIcon },
]

/** A plain button that never takes focus from the text, so the selection stays. */
function ToolButton({ label, pressed, disabled, onPress, children, big }: {
  label: string
  pressed?: boolean
  disabled?: boolean
  onPress: () => void
  children: React.ReactNode
  /** 44 px, for phones. */
  big?: boolean
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={pressed}
      className={`flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-muted outline-none hover:bg-default/70 hover:text-foreground focus-visible:focus-ring disabled:opacity-40 aria-pressed:bg-default aria-pressed:text-foreground ${big ? 'size-11' : 'size-9'}`}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onPress}
      onMouseDown={e => e.preventDefault()}
    >
      {children}
    </button>
  )
}

const Divider = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-separator" />

// ---------------------------------------------------------------------------------------------

export interface StoryEditorProps {
  /** The body to start from; the editor is remounted per language version. */
  body: StoryBody
  language: Language
  placeholder: string
  onChange: (body: StoryBody) => void
  onDirty: () => void
  /** Lab states: open the insert sheet, the pin picker on "Zyt tower", or write with the keyboard drawn. */
  start?: 'media' | 'pinpicker' | 'typing'
}

export default function StoryBodyEditor({ body, language, placeholder, onChange, onDirty, start }: StoryEditorProps) {
  const isWide = useIsWide()
  const [sheet, setSheet] = useState<{ kind: 'media', media: MediaKind } | { kind: 'pin' } | null>(
    start === 'media' ? { kind: 'media', media: 'image' } : start === 'pinpicker' ? { kind: 'pin' } : null,
  )
  const [linkOpen, setLinkOpen] = useState(false)
  const [plusOpen, setPlusOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const callbacksRef = useRef({ onChange, onDirty })
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    callbacksRef.current = { onChange, onDirty }
  })

  const editor = useEditor({
    extensions: editorExtensions,
    content: body,
    shouldRerenderOnTransaction: false,
    immediatelyRender: true,
    autofocus: start === 'typing' ? 'end' : false,
    editorProps: {
      attributes: {
        'aria-label': 'Story text',
        'aria-multiline': 'true',
        'role': 'textbox',
        'lang': language,
        'class': proseClass,
      },
    },
    onCreate: ({ editor: e }) => {
      if (start !== 'pinpicker')
        return
      // The lab's pin picker state: "Zyt tower" is selected, as if the writer had dragged over it.
      e.state.doc.descendants((n, pos) => {
        const at = n.isText ? (n.text ?? '').indexOf('Zyt tower') : -1

        if (at >= 0) {
          e.commands.setTextSelection({ from: pos + at, to: pos + at + 'Zyt tower'.length })

          return false
        }

        return true
      })
    },
    onUpdate: ({ editor: e }) => {
      callbacksRef.current.onDirty()
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => callbacksRef.current.onChange(e.getJSON() as StoryBody), 300)
    },
  })

  // Hand the last edits over when the version closes (language switch, step change).
  useEffect(() => () => {
    window.clearTimeout(timerRef.current)
    if (!editor.isDestroyed)
      callbacksRef.current.onChange(editor.getJSON() as StoryBody)
  }, [editor])

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      quote: e.isActive('blockquote'),
      bullets: e.isActive('bulletList'),
      numbers: e.isActive('orderedList'),
      link: e.isActive('link') ? String(e.getAttributes('link').href ?? '') : '',
      pinId: e.isActive('pinLink') ? String(e.getAttributes('pinLink').pinId ?? '') : '',
      empty: e.state.selection.empty,
      isEmpty: e.isEmpty,
      focused: e.isFocused,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const run = (tool: Tool) => {
    const chain = editor.chain().focus()

    switch (tool) {
      case 'bold': chain.toggleBold().run()
        break
      case 'italic': chain.toggleItalic().run()
        break
      case 'h2': chain.toggleHeading({ level: 2 }).run()
        break
      case 'h3': chain.toggleHeading({ level: 3 }).run()
        break
      case 'quote': chain.toggleBlockquote().run()
        break
      case 'bullets': chain.toggleBulletList().run()
        break
      case 'numbers': chain.toggleOrderedList().run()
        break
    }
  }

  /**
   * Media are top-level blocks: on an empty line they take its place, otherwise they go after
   * the top-level block holding the cursor (never inside a quote or a list).
   */
  const insertMedia = (node: BodyNode) => {
    const { selection } = editor.state
    const { $from } = selection
    let range: number | { from: number, to: number }

    if (selection instanceof NodeSelection)
      range = selection.to
    else if ($from.depth === 0)
      range = $from.pos
    else if ($from.node(1).type.name === 'paragraph' && $from.node(1).content.size === 0)
      range = { from: $from.before(1), to: $from.after(1) }
    else range = $from.after(1)
    editor.chain().focus().insertContentAt(range, node).run()
    setSheet(null)
    setPlusOpen(false)
  }

  const applyPin = (pinId: string) => {
    const pin = pinById.get(pinId)
    const chain = editor.chain().focus()

    if (editor.state.selection.empty && !state.link && !state.pinId)
      chain.insertContent({ type: 'text', text: pin?.name ?? 'pin', marks: [{ type: 'pinLink', attrs: { pinId } }] }).run()
    else if (editor.state.selection.empty)
      chain.extendMarkRange(state.link ? 'link' : 'pinLink').unsetMark('link').setMark('pinLink', { pinId }).run()
    else chain.unsetMark('link').setMark('pinLink', { pinId }).run()
    setSheet(null)
  }

  /** Every raw link to this address becomes a pin link (the warning's "Switch to a pin link"). */
  const switchToPin = (href: string, pinId: string) => {
    const { state: s, view } = editor
    const { link, pinLink } = s.schema.marks
    const tr = s.tr

    s.doc.descendants((n, pos) => {
      if (n.isText && n.marks.some(m => m.type === link && m.attrs.href === href))
        tr.removeMark(pos, pos + n.nodeSize, link).addMark(pos, pos + n.nodeSize, pinLink!.create({ pinId }))
    })
    view.dispatch(tr)
  }

  const openMedia = (media: MediaKind) => {
    setPlusOpen(false)
    setSheet({ kind: 'media', media })
  }

  // The warning for raw links to a pin's website, from the body the parent holds (300 ms behind).
  const hostWarnings = pinHostWarnings(body, pins).filter(w => !dismissed.includes(w.href))
  // At the cursor only when the list above does not already name this link (it lags 300 ms behind typing).
  const cursorWarning = state.link && !dismissed.includes(state.link) && !hostWarnings.some(w => w.href === state.link)
    ? pins.find(p => p.link && hostOf(p.link) === hostOf(state.link))
    : undefined

  const toolRow = (big: boolean) => (
    <>
      {TOOLS.map(t => (
        <ToolButton key={t.id} big={big} label={t.label} pressed={state[t.id]} onPress={() => run(t.id)}>
          {t.icon ? <t.icon aria-hidden size={18} /> : t.text}
        </ToolButton>
      ))}
      <Divider />
      <ToolButton big={big} label="Link" pressed={Boolean(state.link) || linkOpen} onPress={() => setLinkOpen(o => !o)}>
        <LinkIcon aria-hidden size={18} />
      </ToolButton>
      <ToolButton big={big} label="Link a pin" pressed={Boolean(state.pinId)} onPress={() => setSheet({ kind: 'pin' })}>
        <PickupIcon aria-hidden size={18} />
      </ToolButton>
    </>
  )

  /** What the cursor sits on: a link (with the pin-host warning) or a pin link. */
  const context = (linkOpen || cursorWarning || state.pinId) && (
    <div className="flex flex-col gap-2">
      {linkOpen && <LinkForm current={state.link} editor={editor} onDone={() => setLinkOpen(false)} />}
      {!linkOpen && cursorWarning && (
        <PinHostNote
          host={hostOf(state.link)}
          pinName={cursorWarning.name}
          onKeep={() => setDismissed(d => [...d, state.link])}
          onSwitch={() => switchToPin(state.link, cursorWarning.id)}
        />
      )}
      {!linkOpen && state.pinId && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <PickupIcon aria-hidden className="text-accent" size={16} />
          <span>
            {'Pin link: '}
            <span className="font-semibold">{pinById.get(state.pinId)?.name ?? 'Unknown pin'}</span>
            {pinById.get(state.pinId)?.status !== 'published' && <span className="text-muted"> (not published: plain text for guests)</span>}
          </span>
          <button className="text-sm underline underline-offset-4" type="button" onClick={() => setSheet({ kind: 'pin' })} onMouseDown={e => e.preventDefault()}>Change</button>
          <button className="text-sm underline underline-offset-4" type="button" onClick={() => editor.chain().focus().extendMarkRange('pinLink').unsetMark('pinLink').run()} onMouseDown={e => e.preventDefault()}>Remove</button>
        </p>
      )}
    </div>
  )

  // Phones: the bar is always there while writing, pinned above the tab bar, and above the keyboard once it opens.
  const docked = !isWide

  return (
    <div className="relative flex flex-col gap-3">
      {isWide && (
        <div className="sticky top-16 z-10 -mx-2 flex flex-col gap-2 rounded-2xl bg-surface/95 px-2 py-1.5 backdrop-blur">
          <div aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 rounded-xl border border-separator p-1" role="toolbar">
            {toolRow(false)}
            <Divider />
            <Button size="sm" variant="secondary" onPress={() => openMedia('image')}>
              <PhotoAddIcon aria-hidden size={16} />
              Insert
            </Button>
            <span className="flex-1" />
            <ToolButton disabled={!state.canUndo} label="Undo" onPress={() => editor.chain().focus().undo().run()}>
              <UndoIcon aria-hidden size={18} />
            </ToolButton>
            <ToolButton disabled={!state.canRedo} label="Redo" onPress={() => editor.chain().focus().redo().run()}>
              <RedoIcon aria-hidden size={18} />
            </ToolButton>
          </div>
          {context && <div className="px-1 pb-1">{context}</div>}
        </div>
      )}

      {hostWarnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {hostWarnings.map(w => (
            <PinHostNote
              key={w.href}
              host={hostOf(w.href)}
              linkText={w.text}
              pinName={w.pin.name}
              onKeep={() => setDismissed(d => [...d, w.href])}
              onSwitch={() => switchToPin(w.href, w.pin.id)}
            />
          ))}
        </div>
      )}

      {isWide && (
        <BubbleMenu
          className="z-40"
          data-story-bubble=""
          editor={editor}
          options={{ placement: 'top', offset: 10, flip: true }}
          shouldShow={({ view, state: s }) => {
            if (s.selection instanceof NodeSelection)
              return false
            const inMenu = Boolean(document.activeElement?.closest('[data-story-bubble]'))

            return (view.hasFocus() || inMenu) && !s.selection.empty
          }}
        >
          <div aria-label="Formatting the selection" className="flex items-center gap-0.5 rounded-2xl bg-surface p-1.5 shadow-overlay" role="toolbar">
            {toolRow(false)}
          </div>
        </BubbleMenu>
      )}

      {isWide && (
        <FloatingMenu editor={editor} options={{ placement: 'left', offset: 16 }}>
          <div className="flex items-center gap-1">
            <button
              aria-expanded={plusOpen}
              aria-label="Insert a photo, video or recording"
              className={`flex size-9 items-center justify-center rounded-full border border-foreground/40 text-foreground outline-none transition-transform focus-visible:focus-ring ${plusOpen ? 'rotate-45' : ''}`}
              type="button"
              onClick={() => setPlusOpen(o => !o)}
              onMouseDown={e => e.preventDefault()}
            >
              <PlusIcon aria-hidden size={18} />
            </button>
            {plusOpen && (
              <span className="flex items-center gap-1">
                {([['image', 'Photo', PhotoAddIcon], ['video', 'Video', VideoIcon], ['audio', 'Recording', MusicIcon]] as const).map(([id, label, Icon]) => (
                  <button key={id} aria-label={label} className="flex size-9 items-center justify-center rounded-full border border-separator bg-surface text-foreground outline-none hover:bg-default focus-visible:focus-ring" title={label} type="button" onClick={() => openMedia(id)} onMouseDown={e => e.preventDefault()}>
                    <Icon aria-hidden size={18} />
                  </button>
                ))}
              </span>
            )}
          </div>
        </FloatingMenu>
      )}

      <div className="relative lg:ms-12">
        {state.isEmpty && (
          <p aria-hidden className="pointer-events-none absolute start-0 top-0 text-muted/80 text-[17px] leading-8">{placeholder}</p>
        )}
        <EditorContent editor={editor} />
      </div>

      {docked && (
        <DockedBar keyboard={start === 'typing'}>
          {context && <div className="border-b border-separator px-3 py-2">{context}</div>}
          <div aria-label="Formatting" className="flex items-center gap-0.5 overflow-x-auto px-1.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar">
            <ToolButton big label="Insert a photo, video or recording" onPress={() => openMedia('image')}>
              <PlusIcon aria-hidden size={20} />
            </ToolButton>
            <Divider />
            {toolRow(true)}
            <Divider />
            <ToolButton big disabled={!state.canUndo} label="Undo" onPress={() => editor.chain().focus().undo().run()}>
              <UndoIcon aria-hidden size={18} />
            </ToolButton>
            {(state.focused || start === 'typing') && (
              <ToolButton big label="Done" onPress={() => editor.commands.blur()}>
                <CloseIcon aria-hidden size={18} />
              </ToolButton>
            )}
          </div>
        </DockedBar>
      )}

      {sheet?.kind === 'media' && <MediaInsertSheet kind={sheet.media} onClose={() => setSheet(null)} onInsert={insertMedia} />}
      {sheet?.kind === 'pin' && (
        <PinPickerSheet
          note={editor.state.selection.empty ? 'The pin’s name goes in at the cursor. Guests tap it to open the place.' : `“${editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)}” will open the pin. A pin link does not tag the place; tag places in Details.`}
          selected={state.pinId ? [state.pinId] : []}
          title="Link a pin"
          onClose={() => setSheet(null)}
          onDone={ids => ids[0] && applyPin(ids[0])}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------

function LinkForm({ editor, current, onDone }: { editor: ReturnType<typeof useEditor>, current: string, onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [href, setHref] = useState(current || 'https://')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  const [tried, setTried] = useState(false)
  const valid = safeHref(href)

  const apply = () => {
    if (!valid) {
      setTried(true)

      return
    }
    const chain = editor.chain().focus()

    if (editor.state.selection.empty && !current)
      chain.insertContent({ type: 'text', text: valid, marks: [{ type: 'link', attrs: { href: valid } }] }).run()
    else chain.extendMarkRange('link').unsetMark('pinLink').setLink({ href: valid }).run()
    onDone()
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <TextField
        aria-label="Link address"
        className="min-w-0 flex-1 basis-56"
        isInvalid={tried && !valid}
        type="url"
        value={href}
        onChange={setHref}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            apply()
          }
        }}
      >
        <Input ref={inputRef} className="max-lg:h-11" />
        {tried && !valid && <span className="text-xs text-danger">Use a web address (https://…) or an email (mailto:…).</span>}
      </TextField>
      <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={apply}>Apply</Button>
      {current && <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onDone() }}>Remove</Button>}
      <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={onDone}>Cancel</Button>
    </div>
  )
}

/** Non-blocking: a raw link to a pin's website, with the offer to switch to a pin link (ADR-011). */
function PinHostNote({ host, pinName, linkText, onSwitch, onKeep }: {
  host: string
  pinName: string
  linkText?: string
  onSwitch: () => void
  onKeep: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-warning-soft px-3 py-2.5 text-sm text-warning-soft-foreground sm:flex-row sm:items-center" role="status">
      <StatusWarningIcon aria-hidden className="hidden shrink-0 sm:block" size={18} />
      <p className="min-w-0 flex-1 text-pretty">
        {linkText ? `“${linkText}” links to ${host}, ` : `This links to ${host}, `}
        {`the website of your pin ${pinName}. A pin link follows the pin if its website changes.`}
      </p>
      <span className="flex shrink-0 gap-2">
        <Button className="max-lg:h-11" size="sm" variant="secondary" onPress={onSwitch}>Switch to pin link</Button>
        <Button className="max-lg:h-11" size="sm" variant="tertiary" onPress={onKeep}>Keep</Button>
      </span>
    </div>
  )
}

/**
 * The phone formatting bar, always shown while writing: above the tab bar while the keyboard is
 * closed, right above the keyboard once it opens. It follows the visual viewport (written to the
 * element, not to state, so scrolling never re-renders); the lab's typing state draws a keyboard.
 */
function DockedBar({ keyboard, children }: { keyboard: boolean, children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = window.visualViewport

    if (!viewport || keyboard)
      return
    let frame = 0
    const place = () => {
      frame = 0
      const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop)

      // Keyboard closed: the class keeps the bar above the tab bar; open: right above the keyboard.
      if (ref.current)
        ref.current.style.bottom = inset > 0 ? `${inset}px` : ''
    }
    const schedule = () => {
      if (!frame)
        frame = requestAnimationFrame(place)
    }

    place()
    viewport.addEventListener('resize', schedule)
    viewport.addEventListener('scroll', schedule)

    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', schedule)
      viewport.removeEventListener('scroll', schedule)
    }
  }, [keyboard])

  return (
    <div
      ref={ref}
      className={`fixed inset-x-0 z-40 flex flex-col ${keyboard ? 'bottom-0' : 'bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]'}`}
      role="presentation"
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('input'))
          e.preventDefault()
      }}
    >
      <div className="border-t border-separator bg-surface">{children}</div>
      {keyboard && (
        <div aria-hidden className="flex h-64 items-center justify-center bg-default text-xs text-muted">
          Phone keyboard (drawn by the lab)
        </div>
      )}
    </div>
  )
}
