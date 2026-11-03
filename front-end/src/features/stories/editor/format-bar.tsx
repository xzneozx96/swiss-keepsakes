import type { Editor } from '@tiptap/react'

import { Button } from '@heroui/react'
import { useEditorState } from '@tiptap/react'

import {
  BoldIcon,
  BulletListIcon,
  ItalicIcon,
  LinkIcon,
  NumberedListIcon,
  QuoteIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

export interface FormatState {
  bold: boolean
  italic: boolean
  h2: boolean
  h3: boolean
  quote: boolean
  bullets: boolean
  numbers: boolean
  /** The address of the link at the cursor, or ''. */
  link: string
  canUndo: boolean
  canRedo: boolean
  focused: boolean
}

/** What the bar shows pressed, read from the editor's state after every transaction. */
export function useFormatState(editor: Editor): FormatState {
  return useEditorState({
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
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      focused: e.isFocused,
    }),
  })
}

/**
 * One tool: labelled, `aria-pressed`, and it never takes focus from the text so the selection stays. 44 px on a phone,
 * 36 px from 1024 px.
 */
export function ToolButton({ label, pressed, isDisabled, onPress, big, children }: {
  label: string
  pressed?: boolean
  isDisabled?: boolean
  onPress: () => void
  /** 44 px, for phones. */
  big: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      isIconOnly
      preventFocusOnPress
      aria-label={label}
      aria-pressed={pressed}
      className={`shrink-0 rounded-xl ${big ? 'size-11 min-w-11' : 'size-9 min-w-9'} ${pressed ? 'bg-default text-foreground' : 'text-muted'}`}
      isDisabled={isDisabled}
      variant="ghost"
      onPress={onPress}
    >
      {children}
    </Button>
  )
}

const Divider = () => <span aria-hidden className="mx-1 h-6 w-px shrink-0 self-center bg-separator" />

/** The seven tools in the design's order, a divider and Link. Undo and Redo are `UndoRedo`, which the bubble leaves out. */
export function FormatButtons({ editor, state, big, linkOpen, onLink }: {
  editor: Editor
  state: FormatState
  big: boolean
  linkOpen: boolean
  onLink: () => void
}) {
  const { t } = useLocale()
  const chain = () => editor.chain().focus()

  return (
    <>
      <ToolButton big={big} label={t('storyEditor.format.h2')} pressed={state.h2} onPress={() => chain().toggleHeading({ level: 2 }).run()}>
        <span aria-hidden className="text-sm font-semibold">H2</span>
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.h3')} pressed={state.h3} onPress={() => chain().toggleHeading({ level: 3 }).run()}>
        <span aria-hidden className="text-sm font-semibold">H3</span>
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.bold')} pressed={state.bold} onPress={() => chain().toggleBold().run()}>
        <BoldIcon aria-hidden size={18} />
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.italic')} pressed={state.italic} onPress={() => chain().toggleItalic().run()}>
        <ItalicIcon aria-hidden size={18} />
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.quote')} pressed={state.quote} onPress={() => chain().toggleBlockquote().run()}>
        <QuoteIcon aria-hidden size={18} />
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.bullets')} pressed={state.bullets} onPress={() => chain().toggleBulletList().run()}>
        <BulletListIcon aria-hidden size={18} />
      </ToolButton>
      <ToolButton big={big} label={t('storyEditor.format.numbers')} pressed={state.numbers} onPress={() => chain().toggleOrderedList().run()}>
        <NumberedListIcon aria-hidden size={18} />
      </ToolButton>
      <Divider />
      <ToolButton big={big} label={t('storyEditor.format.link')} pressed={state.link !== '' || linkOpen} onPress={onLink}>
        <LinkIcon aria-hidden size={18} />
      </ToolButton>
    </>
  )
}

/** Undo and Redo, which the selection bubble and the phone bar's second row leave out or keep as the design says. */
export function UndoRedo({ editor, state, big, redo = true }: { editor: Editor, state: FormatState, big: boolean, redo?: boolean }) {
  const { t } = useLocale()

  return (
    <>
      <ToolButton big={big} isDisabled={!state.canUndo} label={t('storyEditor.format.undo')} onPress={() => editor.chain().focus().undo().run()}>
        <UndoIcon aria-hidden size={18} />
      </ToolButton>
      {redo && (
        <ToolButton big={big} isDisabled={!state.canRedo} label={t('storyEditor.format.redo')} onPress={() => editor.chain().focus().redo().run()}>
          <RedoIcon aria-hidden size={18} />
        </ToolButton>
      )}
    </>
  )
}
