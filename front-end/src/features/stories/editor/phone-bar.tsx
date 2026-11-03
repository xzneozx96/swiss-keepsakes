import type { Editor } from '@tiptap/react'
import type { FormatState } from './format-bar'

import { useEffect, useRef } from 'react'

import { CloseIcon, PlusIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { FormatButtons, ToolButton, UndoRedo } from './format-bar'

/**
 * The phone formatting bar: pinned above the merchant tab bar (`h-16` plus the home-indicator inset, as merchant-shell
 * draws it) and, once the keyboard opens, right above the keyboard. It follows the visual viewport; the offset is written
 * to the element, not to state, so scrolling never re-renders. 44 px buttons, no Redo, a Done button while the text has
 * focus, and it scrolls sideways when the buttons do not fit. `context` (the link form, or the pin link line) sits above the buttons.
 * It starts with the 44 px "+" that opens the Insert sheet.
 */
export function PhoneBar({ editor, state, linkOpen, onLink, onPin, onInsert, context }: {
  editor: Editor
  state: FormatState
  linkOpen: boolean
  onLink: () => void
  onPin: () => void
  onInsert: () => void
  context: React.ReactNode
}) {
  const { t } = useLocale()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const viewport = window.visualViewport

    if (!viewport)
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
  }, [])

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-40 flex flex-col border-t border-separator bg-surface"
      role="presentation"
      onMouseDown={(event) => {
        // A press on a button must not take focus from the text; the link field is a real input.
        if (!(event.target as HTMLElement).closest('input'))
          event.preventDefault()
      }}
    >
      {context && <div className="border-b border-separator px-3 py-2 empty:hidden">{context}</div>}
      <div aria-label={t('storyEditor.format.toolbar')} className="flex items-center gap-0.5 overflow-x-auto px-1.5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="toolbar">
        <ToolButton big label={t('storyMedia.insert.plus')} onPress={onInsert}>
          <PlusIcon aria-hidden size={20} />
        </ToolButton>
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-separator" />
        <FormatButtons big editor={editor} linkOpen={linkOpen} state={state} onLink={onLink} onPin={onPin} />
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-separator" />
        <UndoRedo big editor={editor} redo={false} state={state} />
        {state.focused && (
          <ToolButton big label={t('storyEditor.format.done')} onPress={() => editor.commands.blur()}>
            <CloseIcon aria-hidden size={18} />
          </ToolButton>
        )}
      </div>
    </div>
  )
}
