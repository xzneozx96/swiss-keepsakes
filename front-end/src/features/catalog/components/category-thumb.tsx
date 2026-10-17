import { Media } from "@/components/media";

interface CategoryThumbProps {
  name: string;
  photo?: string;
  /** Small note on the photo, e.g. "Soon" for tours until Phase 2. */
  note?: string;
}

/**
 * Shared category tile: a 56px photo thumbnail above its label. Used by the home's story
 * categories (inside links) and the gifts and stories filters (inside TagGroup tags). Selection styling
 * follows the parent's data-selected attribute via the `group` class on that parent:
 * red ring plus a check badge, so selection never relies on hue alone.
 */
export function CategoryThumb({ name, photo, note }: CategoryThumbProps) {
  return (
    <>
      <span className="relative block p-0.5">
        <Media
          alt=""
          className="size-14 rounded-2xl shadow-surface ring-2 ring-transparent ring-offset-2 ring-offset-background group-data-[selected=true]:ring-accent"
          photo={photo}
        />
        {note && (
          <span className="absolute -end-2 -top-1.5 rounded-full bg-surface px-1.5 text-[10px] leading-4 font-semibold text-foreground shadow-surface">
            {note}
          </span>
        )}
        <span
          aria-hidden
          className="absolute -end-1 -top-1 hidden size-5 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-surface group-data-[selected=true]:flex"
        >
          <svg fill="none" height="12" viewBox="0 0 24 24" width="12">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
          </svg>
        </span>
      </span>
      <span className="line-clamp-2 text-center leading-4 text-balance">
        {name}
      </span>
    </>
  );
}

/** Classes for the element that wraps a CategoryThumb (link or tag). */
export const categoryThumbItemClass =
  "group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl text-xs font-medium text-muted select-none outline-none transition-transform focus-visible:focus-ring active:scale-95";
