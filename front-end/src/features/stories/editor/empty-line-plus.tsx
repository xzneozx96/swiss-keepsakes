import type { Editor } from '@tiptap/react'

import { FloatingMenu } from '@tiptap/react/menus'
import { useState } from 'react'

import { MusicIcon, PhotoAddIcon, PlusIcon, VideoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

type Tab = 'image' | 'video' | 'audio'

/**
 * The laptop "+" at the start of an empty line (it shows only there: that is Tiptap's own rule for a floating menu). It opens three round
 * buttons, one per kind, and each opens the Insert sheet on its tab. Presses never take focus from the text.
 */
export function EmptyLinePlus({ editor, onInsert }: { editor: Editor, onInsert: (tab: Tab) => void }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const kinds = [
    { tab: 'image', label: t('storyMedia.insert.plus.photo'), Icon: PhotoAddIcon },
    { tab: 'video', label: t('storyMedia.insert.plus.video'), Icon: VideoIcon },
    { tab: 'audio', label: t('storyMedia.insert.plus.recording'), Icon: MusicIcon },
  ] as const

  return (
    <FloatingMenu editor={editor} options={{ placement: 'left', offset: 16 }}>
      <div className="flex items-center gap-1">
        <button
          aria-expanded={open}
          aria-label={t('storyMedia.insert.plus')}
          className={`flex size-9 items-center justify-center rounded-full border border-foreground/40 text-foreground outline-none transition-transform focus-visible:focus-ring ${open ? 'rotate-45' : ''}`}
          type="button"
          onClick={() => setOpen(current => !current)}
          onMouseDown={event => event.preventDefault()}
        >
          <PlusIcon aria-hidden size={18} />
        </button>
        {open && (
          <span className="flex items-center gap-1">
            {kinds.map(({ tab, label, Icon }) => (
              <button key={tab} aria-label={label} className="flex size-9 items-center justify-center rounded-full border border-separator bg-surface text-foreground outline-none hover:bg-default focus-visible:focus-ring" title={label} type="button" onClick={() => onInsert(tab)} onMouseDown={event => event.preventDefault()}>
                <Icon aria-hidden size={18} />
              </button>
            ))}
          </span>
        )}
      </div>
    </FloatingMenu>
  )
}
