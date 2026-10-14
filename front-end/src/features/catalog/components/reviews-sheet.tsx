import type { ReviewView } from "./review-item";
import type { ReviewSummaryProps } from "./review-summary";

import { Drawer } from "@heroui/react";

import { ReviewItem } from "./review-item";
import { ReviewSummary } from "./review-summary";

export interface ReviewsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name, e.g. "Reviews of Kapellbrücke pocket knife". */
  title: string;
  closeLabel: string;
  summary: ReviewSummaryProps;
  /** "Overall rating" and the share per star, 5 down to 1. */
  overall: { label: string; rows: { stars: number; share: number }[] };
  items: ReviewView[];
}

/**
 * All reviews of a listing in a tall bottom sheet (Airbnb, owner references): the
 * laurel score and badge, an "Overall rating" bar per star, then every review in full.
 * No search: there are few reviews per gift (owner, 13.10.2026). Shared by gifts and,
 * later, tours.
 */
export function ReviewsSheet({
  isOpen,
  onOpenChange,
  title,
  closeLabel,
  summary,
  overall,
  items,
}: ReviewsSheetProps) {
  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog aria-label={title} className="flex h-[94dvh] flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-start">
            <Drawer.CloseTrigger aria-label={closeLabel} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-8 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
            <ReviewSummary {...summary} />

            <div className="flex flex-col gap-2 border-b border-separator pb-6">
              <span className="text-sm font-semibold">{overall.label}</span>
              <ul className="flex flex-col gap-1">
                {overall.rows.map(({ stars, share }) => (
                  <li
                    key={stars}
                    className="flex items-center gap-3 text-xs tabular-nums"
                  >
                    <span className="w-2">{stars}</span>
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                      <span
                        className="block h-full rounded-full bg-foreground"
                        style={{ width: `${Math.round(share * 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="flex flex-col gap-10">
              {items.map((r) => (
                <li key={r.id}>
                  <ReviewItem layout="full" review={r} />
                </li>
              ))}
            </ul>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
