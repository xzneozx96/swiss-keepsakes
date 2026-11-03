import type { RichNode } from '@sk/domain/shared'
import type { Editor } from '@tiptap/react'

import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { textAreaVariants } from '@heroui/styles'
import { isEmptyDoc, isUploadedPhoto, safeHref } from '@sk/domain/shared'
import { EditorContent, Node, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

import { useEffect, useId, useRef, useState } from 'react'

import {
  BoldIcon,
  BulletListIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  NumberedListIcon,
  PhotoAddIcon,
  QuoteIcon,
  RedoIcon,
  UndoIcon,
  UploadIcon,
} from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { PhotoSheet } from '@/features/content/merchant/components/media-sheets'
import { photoUrl } from '@/lib/photos'
import { usePhotoInput } from './photo-field'

/**
 * A story photo: one `photo` attribute holding a library slug or an uploaded data URL,
 * resolved through lib/photos when drawn. Stock Tiptap Image would store `src`, which for
 * library photos is a hashed asset URL that breaks with the next build.
 */
const StoryPhoto = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return { photo: { default: null }, alt: { default: '' } }
  },
  parseHTML() {
    return [
      {
        tag: 'img[data-photo]',
        getAttrs: (element) => {
          const photo = (element as HTMLElement).getAttribute('data-photo')

          return photo && (isUploadedPhoto(photo) || photoUrl(photo))
            ? { photo, alt: (element as HTMLElement).getAttribute('alt') ?? '' }
            : false
        },
      },
    ]
  },
  renderHTML({ node }) {
    const photo = node.attrs.photo as string | null

    return [
      'img',
      {
        'data-photo': photo ?? '',
        'src': photoUrl(photo ?? undefined) ?? '',
        'alt': (node.attrs.alt as string) ?? '',
      },
    ]
  },
})

/**
 * What each editor allows. `story` is the long story of a gift or tour. `text` is the description of a keepsake (owner
 * 2026-11-01): bold, italic, both lists and links, and nothing else. The nodes a kit does not allow are switched off, not
 * hidden, so a typed `## `, a `> ` or a pasted page cannot make a node the API would refuse.
 */
export type EditorKit = 'story' | 'text'

export function editorExtensions(kit: EditorKit) {
  return [
    StarterKit.configure({
      heading: kit === 'story' ? { levels: [3] } : false,
      blockquote: kit === 'story' ? undefined : false,
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
    }),
    ...(kit === 'story' ? [StoryPhoto] : []),
  ]
}

/**
 * One field like a regular text area: the toolbar and the text share the border, radius, background and focus ring of
 * `textAreaVariants`. The text area's own CSS reacts to `:focus` on the element itself, so the focus state follows
 * `focus-within` here, with the same field tokens.
 */
const fieldClass = [
  textAreaVariants({ fullWidth: true }),
  'flex flex-col overflow-hidden p-0',
  'focus-within:status-focused-field focus-within:border-field-border-focus focus-within:bg-field-focus',
].join(' ')

/** The same typography as the guests' story sheet (components/rich-text.tsx). */
const contentClass = [
  'max-h-[32rem] min-h-44 max-w-none overflow-y-auto px-3 py-2.5 text-base outline-none sm:text-sm',
  '[&>*+*]:mt-3 [&_p]:text-body [&_p]:leading-7',
  '[&_h3]:pt-1 [&_h3]:font-serif [&_h3]:text-title',
  '[&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6',
  '[&_blockquote]:border-s-2 [&_blockquote]:border-separator [&_blockquote]:ps-4 [&_blockquote]:font-serif [&_blockquote]:italic',
  '[&_a]:underline [&_a]:underline-offset-4',
  '[&_img]:aspect-[4/3] [&_img]:w-full [&_img]:rounded-3xl [&_img]:object-cover',
  '[&_img.ProseMirror-selectednode]:ring-2 [&_img.ProseMirror-selectednode]:ring-foreground',
].join(' ')

function ToolButton({
  label,
  icon: Icon,
  isActive,
  isDisabled,
  onPress,
}: {
  label: string
  icon: typeof BoldIcon
  isActive?: boolean
  isDisabled?: boolean
  onPress: () => void
}) {
  return (
    <Button
      isIconOnly
      aria-label={label}
      aria-pressed={isActive}
      className={`rounded-lg ${isActive ? 'bg-default text-foreground' : 'text-muted'}`}
      isDisabled={isDisabled}
      size="sm"
      variant="ghost"
      onPress={onPress}
    >
      <Icon aria-hidden size={18} />
    </Button>
  )
}

/** Link address under the toolbar: Apply or Remove, web and mail links only. */
function LinkForm({ editor, onDone }: { editor: Editor, onDone: () => void }) {
  const { t } = useLocale()
  const current = editor.getAttributes('link').href as string | undefined
  const [href, setHref] = useState(current ?? 'https://')
  const [tried, setTried] = useState(false)
  const valid = safeHref(href)

  const apply = () => {
    if (!valid) {
      setTried(true)

      return
    }
    const chain = editor.chain().focus()

    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain
        .insertContent({
          type: 'text',
          text: valid,
          marks: [{ type: 'link', attrs: { href: valid } }],
        })
        .run()
    }
    else {
      chain.extendMarkRange('link').setLink({ href: valid }).run()
    }
    onDone()
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3">
      <TextField
        fullWidth
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
        <Label>{t('products.editor.linkLabel')}</Label>
        <Input />
        <FieldError>{t('products.editor.linkError')}</FieldError>
      </TextField>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onPress={apply}>
          {t('products.editor.linkApply')}
        </Button>
        {current && (
          <Button
            size="sm"
            variant="tertiary"
            onPress={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              onDone()
            }}
          >
            {t('products.editor.linkRemove')}
          </Button>
        )}
        <Button size="sm" variant="tertiary" onPress={onDone}>
          {t('merchantOrder.sheet.back')}
        </Button>
      </div>
    </div>
  )
}

/**
 * The long story's rich-text editor (Tiptap, owner 15.10.2026): a labelled toolbar with
 * heading, bold, italic, both lists, quote, link, photos (upload or library) and
 * undo/redo, wrapping at 375px, then the text in the guest sheet's typography. Loaded
 * lazily, so only M12 and M13 pull in Tiptap.
 */
export default function StoryEditor({
  label,
  value,
  onChange,
  kit = 'story',
  lang,
}: {
  label: string
  value: RichNode | undefined
  onChange: (doc: RichNode | undefined) => void
  kit?: EditorKit
  /** The language of the text, for spell checking and screen readers. */
  lang?: string
}) {
  const { t } = useLocale()
  const labelId = useId()
  const [linkOpen, setLinkOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  // The editor keeps its first callbacks; read the latest one through a ref.
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  })
  const editor = useEditor({
    extensions: editorExtensions(kit),
    content: value ?? '',
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        'aria-labelledby': labelId,
        'aria-multiline': 'true',
        'role': 'textbox',
        ...(lang && { lang }),
        'class': contentClass,
      },
    },
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as RichNode

      onChangeRef.current(isEmptyDoc(doc) ? undefined : doc)
    },
  })
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      heading: e.isActive('heading', { level: 3 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      blockquote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })
  // After a selected photo, never over it: inserting into a node selection would replace it.
  const insertPhoto = (photo: string) => {
    const node = { type: 'image', attrs: { photo, alt: '' } }
    const { selection } = editor.state
    const chain = editor.chain().focus()

    if ('node' in selection)
      chain.insertContentAt(selection.to, node).run()
    else chain.insertContent(node).run()
  }
  const upload = usePhotoInput(insertPhoto)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium" id={labelId}>
        {label}
      </span>
      <div className={fieldClass}>
        <div
          aria-label={t('products.editor.toolbar')}
          className="flex flex-wrap items-center gap-1 border-b border-separator p-1"
          role="toolbar"
        >
          {kit === 'story' && (
            <ToolButton
              icon={HeadingIcon}
              isActive={state.heading}
              label={t('products.editor.heading')}
              onPress={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()}
            />
          )}
          <ToolButton
            icon={BoldIcon}
            isActive={state.bold}
            label={t('products.editor.bold')}
            onPress={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolButton
            icon={ItalicIcon}
            isActive={state.italic}
            label={t('products.editor.italic')}
            onPress={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolButton
            icon={BulletListIcon}
            isActive={state.bulletList}
            label={t('products.editor.bullets')}
            onPress={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolButton
            icon={NumberedListIcon}
            isActive={state.orderedList}
            label={t('products.editor.numbers')}
            onPress={() => editor.chain().focus().toggleOrderedList().run()}
          />
          {kit === 'story' && (
            <ToolButton
              icon={QuoteIcon}
              isActive={state.blockquote}
              label={t('products.editor.quote')}
              onPress={() => editor.chain().focus().toggleBlockquote().run()}
            />
          )}
          <ToolButton
            icon={LinkIcon}
            isActive={state.link || linkOpen}
            label={t('products.editor.link')}
            onPress={() => setLinkOpen(open => !open)}
          />
          {kit === 'story' && (
            <>
              <ToolButton
                icon={UploadIcon}
                label={t('products.photo.upload')}
                onPress={upload.open}
              />
              <ToolButton
                icon={PhotoAddIcon}
                label={t('products.photo.library')}
                onPress={() => setLibraryOpen(true)}
              />
            </>
          )}
          <ToolButton
            icon={UndoIcon}
            isDisabled={!state.canUndo}
            label={t('products.editor.undo')}
            onPress={() => editor.chain().focus().undo().run()}
          />
          <ToolButton
            icon={RedoIcon}
            isDisabled={!state.canRedo}
            label={t('products.editor.redo')}
            onPress={() => editor.chain().focus().redo().run()}
          />
        </div>
        <EditorContent editor={editor} />
      </div>
      {kit === 'story' && upload.input}
      {upload.error && (
        <p data-visible className="field-error" role="alert">
          {upload.error}
        </p>
      )}
      {linkOpen && (
        <LinkForm editor={editor} onDone={() => setLinkOpen(false)} />
      )}
      {libraryOpen && (
        <PhotoSheet
          value=""
          onChoose={(slug) => {
            setLibraryOpen(false)
            insertPhoto(slug)
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  )
}
