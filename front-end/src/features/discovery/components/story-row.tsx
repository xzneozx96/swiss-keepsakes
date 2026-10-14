import { Link } from "@tanstack/react-router";

import { ChevronRightIcon } from "@/components/icons";
import { Media } from "@/components/media";

interface StoryRowProps {
  /** Opens C20; both language versions share the slug. */
  slug: string;
  photo: string;
  title: string;
  meta: string;
}

/**
 * One story under a time block on C01 (spec §4.1): a quiet row after the block's rail, so
 * the rail stays the block's main content and no card sits inside another.
 */
export function StoryRow({ slug, photo, title, meta }: StoryRowProps) {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-2xl py-1 outline-none select-none focus-visible:focus-ring active:opacity-70"
      params={{ slug }}
      to="/stories/$slug"
    >
      <Media alt="" className="size-16 shrink-0 rounded-2xl" photo={photo} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-serif text-card-title text-balance">{title}</p>
        <p className="text-label text-muted">{meta}</p>
      </div>
      <ChevronRightIcon className="shrink-0 text-muted" size={18} />
    </Link>
  );
}
