import { Link } from "@tanstack/react-router";

import { Media } from "@/components/media";

interface StoryCardProps {
  /** Opens C20; both language versions share the slug. */
  slug: string;
  photo: string;
  title: string;
  meta: string;
  /** Shown on the C19 list only; the C01 rail keeps cards short. */
  excerpt?: string;
  layout?: "rail" | "list";
}

/**
 * A story on the C01 rail or the C19 list (spec §4.11). The list layout follows the C02
 * gift card: a 4:3 photo, serif title, then the excerpt and read time.
 */
export function StoryCard({
  slug,
  photo,
  title,
  meta,
  excerpt,
  layout = "list",
}: StoryCardProps) {
  const rail = layout === "rail";

  return (
    <Link
      className={`flex flex-col rounded-3xl outline-none focus-visible:focus-ring transition-transform active:scale-[0.98] ${rail ? "w-72 shrink-0 snap-start gap-2" : "gap-2.5"}`}
      params={{ slug }}
      to="/stories/$slug"
    >
      <Media
        alt=""
        className={`rounded-3xl ${rail ? "aspect-[16/10]" : "aspect-[4/3]"}`}
        photo={photo}
      />
      <div className={`flex flex-col px-1 ${rail ? "gap-0.5" : "gap-1"}`}>
        <h3 className="font-serif text-card-title text-balance">{title}</h3>
        {excerpt && (
          <p className="line-clamp-2 text-sm text-foreground/75">{excerpt}</p>
        )}
        <p className="text-label text-muted">{meta}</p>
      </div>
    </Link>
  );
}
