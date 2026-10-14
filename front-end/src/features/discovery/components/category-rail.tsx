import type { BusinessTypeId } from "../seed";

import { Link } from "@tanstack/react-router";

import {
  CategoryThumb,
  categoryThumbItemClass,
} from "@/features/catalog/components/category-thumb";

export interface CategoryRailItem {
  id: BusinessTypeId;
  name: string;
  photo?: string;
  /** Small note on the photo for types not open yet, e.g. "Soon". */
  note?: string;
}

const destinations: Record<
  BusinessTypeId,
  "/gifts" | "/tours" | "/stays" | "/experiences"
> = {
  gifts: "/gifts",
  tours: "/tours",
  stays: "/stays",
  experiences: "/experiences",
};

/**
 * Discovery rail of business types (PRD §7: gifts, tours, stays, experiences) using the
 * shared CategoryThumb as links. Each opens its own screen; types not open yet carry a
 * "Soon" note and open a later-phase page.
 */
export function CategoryRail({
  label,
  items,
}: {
  label: string;
  items: CategoryRailItem[];
}) {
  return (
    <nav aria-label={label}>
      <ul className="grid grid-cols-4 gap-1 pt-2 pb-1">
        {items.map(({ id, name, photo, note }) => (
          <li key={id} className="flex justify-center">
            <Link
              className={`${categoryThumbItemClass} text-foreground`}
              to={destinations[id]}
            >
              <CategoryThumb name={name} note={note} photo={photo} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
