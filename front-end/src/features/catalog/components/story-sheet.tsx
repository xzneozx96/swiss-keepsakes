import { Drawer } from "@heroui/react";

import { Media } from "@/components/media";

export interface StoryView {
  /** Small label above the title, e.g. "The story behind it". */
  label: string;
  title: string;
  chapters: { title: string; body: string; photo?: string }[];
  /** Shown when the story is only in the other language (R02). */
  languageNote?: string;
}

/**
 * The full story behind a gift, read in a tall bottom sheet (Airbnb "Show more" on
 * About): a title, then illustrated chapters. Shared by gifts and tours.
 */
export function StorySheet({
  story,
  closeLabel,
  isOpen,
  onOpenChange,
}: {
  story: StoryView;
  closeLabel: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog
          aria-label={story.title}
          className="flex h-[94dvh] flex-col"
        >
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
            {story.chapters.map((chapter, i) => (
              <section key={chapter.title} className="flex flex-col gap-3">
                {chapter.photo && (
                  <Media
                    alt=""
                    className="aspect-[4/3] rounded-3xl"
                    photo={chapter.photo}
                  />
                )}
                <span className="text-label text-muted tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-title text-balance">
                  {chapter.title}
                </h3>
                <p className="text-body leading-7">{chapter.body}</p>
              </section>
            ))}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
