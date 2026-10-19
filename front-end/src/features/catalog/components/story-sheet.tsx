import type { RichNode } from '@sk/domain/shared'

import { Drawer } from '@heroui/react'

import { RichText } from '@/components/rich-text'
import { useSheetExit } from '@/components/sheet-exit'

export interface StoryView {
  /** Small label above the title, e.g. "The story behind it". */
  label: string
  title: string
  /** The rich body in the guest's language, or the other one with `languageNote`. */
  body: RichNode
  /** Shown when the story is only in the other language (R02). */
  languageNote?: string
}

/**
 * The full story behind a gift, read in a tall bottom sheet (Airbnb "Show more" on
 * About): a title, then the rich body the shop wrote in M12/M13 (photos, headings,
 * paragraphs, lists, quotes). Shared by gifts and tours.
 */
export function StorySheet({
  story,
  closeLabel,
  isOpen,
  onOpenChange,
}: {
  story: StoryView
  closeLabel: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const exitRef = useSheetExit()

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog
          aria-label={story.title}
          className="flex h-[94dvh] flex-col"
        >
          <span ref={exitRef} hidden />
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-start">
            <Drawer.CloseTrigger aria-label={closeLabel} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-8 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+32px)] text-foreground">
            <header className="flex flex-col gap-2">
              <span className="text-label tracking-wide text-muted uppercase">
                {story.label}
              </span>
              <h2 className="font-serif text-display text-balance">
                {story.title}
              </h2>
              {story.languageNote && (
                <span className="text-xs text-muted">{story.languageNote}</span>
              )}
            </header>
            <RichText doc={story.body} />
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
