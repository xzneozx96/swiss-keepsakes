import type { StoryDraft } from '@sk/api-contract'
import type { BodyHandover } from '../hooks/use-story-version-editor'
import type { PinOption } from '../lib/pins'
import type { StoryLanguage } from '../lib/search-params'
import type { BodySheet } from './body-sheets'

import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useLatest } from '@/hooks/use-latest'
import { cleanBody } from '../lib/body'
import { BodyEditorContext } from './body-context'
import { BodySheets } from './body-sheets'
import { EmptyLinePlus } from './empty-line-plus'
import { createStoryExtensions, storyEditorProps } from './extensions'
import { FormatButtons, UndoRedo, useFormatState } from './format-bar'
import { LinkContext } from './link-context'
import { LinkForm } from './link-form'
import { PhoneBar } from './phone-bar'

/** The wait after the last key before the body goes up to the card (autosave waits 1.5 s after that). */
export const HANDOVER_MS = 300

/** Writing looks like reading: 17 px text on a 32 px line, serif headings (design section 4). */
const proseClass = [
  'min-h-48 max-w-none outline-none',
  '[&_p]:text-[17px] [&_p]:leading-8 [&_li]:text-[17px] [&_li]:leading-8',
  '[&>*+*]:mt-4 [&_h2]:pt-6 [&_h2]:font-serif [&_h2]:text-title [&_h3]:pt-3 [&_h3]:font-serif [&_h3]:text-heading',
  '[&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6 [&_li+li]:mt-1',
  '[&_blockquote]:border-s-2 [&_blockquote]:border-foreground [&_blockquote]:ps-4 [&_blockquote]:font-serif [&_blockquote]:text-lg [&_blockquote]:italic',
  '[&_a]:underline [&_a]:underline-offset-4',
  '[&_a.pin-link]:rounded-md [&_a.pin-link]:bg-accent-soft [&_a.pin-link]:px-1 [&_a.pin-link]:text-accent-soft-foreground [&_a.pin-link]:no-underline',
].join(' ')

/**
 * The Tiptap body editor of one language version. It starts from `body` and is remounted per language and per Review
 * round trip, so it is uncontrolled: it reports a cleaned body (`cleanBody`) through `onChange` 300 ms after the last
 * key, and `onDirty` at once on every change so the header says "Unsaved" and the leave guard asks. A body still waiting
 * is handed over by `handoff`, which the version editor calls before a save, a switch or Review, and on unmount.
 */
export default function StoryBodyEditor({ storeId, pins, body, language, onChange, onDirty, registerHandover }: {
  storeId: string
  pins: PinOption[]
  body: StoryDraft['body']
  language: StoryLanguage
  onChange: (body: StoryDraft['body']) => void
  onDirty: () => void
  registerHandover: (handover: BodyHandover | null) => void
}) {
  const { t } = useLocale()
  const isWide = useIsWide()
  const [linkOpen, setLinkOpen] = useState(false)
  const [sheet, setSheet] = useState<BodySheet | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])
  const callbacks = useLatest({ onChange, onDirty, registerHandover })
  const timerRef = useRef<number | undefined>(undefined)
  const [extensions] = useState(() => createStoryExtensions({ image: t('storyEditor.body.media.image'), video: t('storyEditor.body.media.video'), audio: t('storyEditor.body.media.audio') }))

  const editor = useEditor({
    extensions,
    content: body as never,
    shouldRerenderOnTransaction: false,
    immediatelyRender: true,
    editorProps: {
      ...storyEditorProps,
      attributes: {
        'aria-label': t('storyEditor.body.label'),
        'aria-multiline': 'true',
        'role': 'textbox',
        'lang': language,
        'class': proseClass,
      },
    },
    onUpdate: ({ editor: current }) => {
      callbacks.current.onDirty()
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        timerRef.current = undefined
        callbacks.current.onChange(cleanBody(current.getJSON()))
      }, HANDOVER_MS)
    },
  })

  // The version editor reaches into the wait through this; it also runs when the editor goes away.
  useEffect(() => {
    const handoff = () => {
      if (timerRef.current === undefined)
        return
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
      callbacks.current.onChange(cleanBody(editor.getJSON()))
    }

    // Any render's `registerHandover` writes the same ref in the version editor, so the first one serves for the cleanup too.
    const { registerHandover: register } = callbacks.current

    register({
      handoff,
      cancel: () => {
        window.clearTimeout(timerRef.current)
        timerRef.current = undefined
      },
    })

    return () => {
      handoff()
      register(null)
    }
  }, [editor, callbacks])

  const state = useFormatState(editor)
  const isEmpty = useEditorState({ editor, selector: ({ editor: e }) => e.isEmpty })
  const toggleLink = () => setLinkOpen(open => !open)
  const linkForm = linkOpen && <LinkForm current={state.link} editor={editor} onDone={() => setLinkOpen(false)} />
  const openInsert = (tab: 'image' | 'video' | 'audio' = 'image') => setSheet({ kind: 'insert', tab })
  const openPin = () => setSheet({ kind: 'pin', current: state.pinId })
  // The line under the bar: the link form while it is open, else the pin link or the pin website warning for the cursor's link.
  const line = linkForm || <LinkContext dismissed={dismissed} editor={editor} link={state.link} pinId={state.pinId} pins={pins} onChangePin={openPin} onKeep={host => setDismissed(current => [...current, host])} />

  return (
    <div className="relative flex flex-col gap-3">
      {isWide && (
        <div className="sticky top-16 z-10 -mx-2 flex flex-col gap-2 rounded-2xl bg-surface/95 px-2 py-1.5 backdrop-blur">
          <div aria-label={t('storyEditor.format.toolbar')} className="flex flex-wrap items-center gap-0.5 rounded-xl border border-separator p-1" role="toolbar">
            <FormatButtons big={false} editor={editor} linkOpen={linkOpen} state={state} onInsert={() => openInsert()} onLink={toggleLink} onPin={openPin} />
            <span className="flex-1" />
            <UndoRedo big={false} editor={editor} state={state} />
          </div>
          <div className="px-1 pb-1 empty:hidden">{line}</div>
        </div>
      )}

      {isWide && (
        <BubbleMenu
          className="z-40"
          data-story-bubble=""
          editor={editor}
          options={{ placement: 'top', offset: 10, flip: true }}
          shouldShow={({ view, state: current }) => {
            if (current.selection instanceof NodeSelection)
              return false
            const inMenu = Boolean(document.activeElement?.closest('[data-story-bubble]'))

            return (view.hasFocus() || inMenu) && !current.selection.empty
          }}
        >
          <div aria-label={t('storyEditor.format.selection')} className="flex items-center gap-0.5 rounded-2xl bg-surface p-1.5 shadow-overlay" role="toolbar">
            <FormatButtons big={false} editor={editor} linkOpen={linkOpen} state={state} onLink={toggleLink} onPin={openPin} />
          </div>
        </BubbleMenu>
      )}

      {isWide && <EmptyLinePlus editor={editor} onInsert={openInsert} />}

      <div className="relative">
        {isEmpty && <p aria-hidden className="pointer-events-none absolute start-0 top-0 text-[17px] leading-8 text-muted/80">{t('storyEditor.body.placeholder')}</p>}
        <BodyEditorContext value={{ storeId, language }}>
          <EditorContent editor={editor} />
        </BodyEditorContext>
      </div>

      {!isWide && <PhoneBar context={line} editor={editor} linkOpen={linkOpen} state={state} onInsert={() => openInsert()} onLink={toggleLink} onPin={openPin} />}

      <BodySheets editor={editor} language={language} sheet={sheet} storeId={storeId} onClose={() => setSheet(null)} />
    </div>
  )
}
