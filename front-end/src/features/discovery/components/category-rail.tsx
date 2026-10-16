import { Link } from "@tanstack/react-router";

import {
  CategoryThumb,
  categoryThumbItemClass,
} from "@/features/catalog/components/category-thumb";

export type CategoryRailId = "tours" | "victorinox" | "keepsakes";

export interface CategoryRailItem {
  id: CategoryRailId;
  name: string;
  photo?: string;
}

/**
 * Discovery rail of three tiles in the order of the home sections: tours, Victorinox and
 * keepsakes. Victorinox opens the keepsakes list filtered to its sub-category. Uses the
 * shared CategoryThumb as links.
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
      <ul className="grid grid-cols-3 gap-1 pt-2 pb-1">
        {items.map(({ id, name, photo }) => (
          <li key={id} className="flex justify-center">
            {id === "tours" && (
              <Link
                className={`${categoryThumbItemClass} text-foreground`}
                to="/tours"
              >
                <CategoryThumb name={name} photo={photo} />
              </Link>
            )}
            {id === "victorinox" && (
              <Link
                className={`${categoryThumbItemClass} text-foreground`}
                search={{ subcategory: "victorinox" }}
                to="/gifts"
              >
                <CategoryThumb name={name} photo={photo} />
              </Link>
            )}
            {id === "keepsakes" && (
              <Link
                className={`${categoryThumbItemClass} text-foreground`}
                to="/gifts"
              >
                <CategoryThumb name={name} photo={photo} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
